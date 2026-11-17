import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useState, type PropsWithChildren } from 'react';
import { AppState, Platform } from 'react-native';
import { defaultRemoteConfig, parseRemoteConfig, type RemoteConfig } from './remote-config-model';

export const remoteConfigCacheKey = 'e9-public-mobile-config-v1';
const maxCacheAgeMs = 7 * 24 * 60 * 60 * 1000;
const refreshIntervalMs = 60 * 60 * 1000;
const ConfigContext = createContext<RemoteConfig>(defaultRemoteConfig);
export function readCachedConfig(raw: string | null, now = Date.now()): RemoteConfig | undefined {
  if (!raw || raw.length > 40000) return;
  try {
    const cached = JSON.parse(raw);
    if (!Number.isFinite(cached.savedAt) || cached.savedAt > now || now - cached.savedAt > maxCacheAgeMs) return;
    return parseRemoteConfig(JSON.stringify(cached.config));
  } catch { return; }
}

export async function fetchRemoteConfig(signal: AbortSignal): Promise<RemoteConfig | undefined> {
  const origin = process.env.EXPO_PUBLIC_API_BASE_URL ?? (__DEV__ ? (Platform.OS === 'android' ? 'http://10.0.2.2:3001' : 'http://127.0.0.1:3001') : '');
  try {
    const url = new URL(origin);
    if ((url.protocol !== 'https:' && !(__DEV__ && url.protocol === 'http:')) || url.username || url.password || url.search || url.hash || url.pathname !== '/') return;
    while (!signal.aborted) {
      const response = await fetch(`${url.origin}/v1/mobile-config`, { signal, cache: 'no-store', credentials: 'omit', redirect: 'error' });
      const contentType = response.headers.get('content-type') ?? '';
      if ([502, 503, 504].includes(response.status) || (response.ok && contentType.includes('text/html'))) {
        // Render Free may serve its temporary loading page while waking. Only
        // this public GET retries, within the provider's single total deadline.
        await new Promise<void>(resolve => {
          const finish = () => { clearTimeout(timer); signal.removeEventListener('abort', finish); resolve(); };
          const timer = setTimeout(finish, 2000);
          signal.addEventListener('abort', finish, { once: true });
          if (signal.aborted) finish();
        });
        continue;
      }
      if (!response.ok || !contentType.includes('application/json')) return;
      if (Number(response.headers.get('content-length')) > 32768) return;
      return parseRemoteConfig(await response.text());
    }
  } catch { return; }
}

export function RemoteConfigProvider({ children }: PropsWithChildren) {
  const [config, setConfig] = useState(defaultRemoteConfig);
  useEffect(() => {
    let active = true, fetched = false, pending = false;
    let lastAttempt = -Infinity;
    let expiresAt = Infinity;
    let expiryTimer: ReturnType<typeof setTimeout> | undefined;
    let requestTimer: ReturnType<typeof setTimeout> | undefined;
    let controller: AbortController | undefined;
    function apply(value: RemoteConfig, savedAt: number) {
      expiresAt = savedAt + maxCacheAgeMs;
      setConfig(value);
      clearTimeout(expiryTimer);
      expiryTimer = setTimeout(() => { if (active) setConfig(defaultRemoteConfig); }, Math.max(0, expiresAt - Date.now()));
    }
    // A late disk read cannot overwrite newer network settings. Cache hydration
    // never gates the splash, navigation, or financial requests.
    void AsyncStorage.getItem(remoteConfigCacheKey).then(raw => {
      const cached = readCachedConfig(raw);
      if (active && !fetched && cached && raw) apply(cached, JSON.parse(raw).savedAt);
    }).catch(() => {});
    async function refresh() {
      if (!active) return;
      if (Date.now() >= expiresAt) setConfig(defaultRemoteConfig);
      if (pending || Date.now() - lastAttempt < refreshIntervalMs) return;
      pending = true; lastAttempt = Date.now();
      const request = new AbortController(); controller = request;
      // Race bounds the body read even if fetch fails to reject on abort.
      const timeout = new Promise<undefined>(resolve => {
        requestTimer = setTimeout(() => { request.abort(); resolve(undefined); }, 90000);
      });
      const next = await Promise.race([fetchRemoteConfig(request.signal), timeout]);
      clearTimeout(requestTimer); pending = false;
      if (!active || request.signal.aborted || !next) return;
      fetched = true;
      const savedAt = Date.now(); apply(next, savedAt);
      void AsyncStorage.setItem(remoteConfigCacheKey, JSON.stringify({ savedAt, config: next })).catch(() => {});
    }
    void refresh();
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') void refresh(); else controller?.abort();
    });
    return () => { active = false; controller?.abort(); clearTimeout(requestTimer); clearTimeout(expiryTimer); subscription.remove(); };
  }, []);
  return <ConfigContext.Provider value={config}>{children}</ConfigContext.Provider>;
}
export function useRemoteConfig() { return useContext(ConfigContext); }
