import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { readPreference } from './preferences';
import * as work from './modules/work/storage';
import * as expenses from './modules/expenses/storage';

export const LOCAL_DATA_NOTICE_KEY = 'e9-local-data-notice-v1';
function useNoticeState(enabled: boolean) {
  const [accepted, setAccepted] = useState(false);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const acceptedRef = useRef(false);
  const pending = useRef<Promise<boolean> | undefined>(undefined);
  const accept = useCallback((): Promise<boolean> => {
    if (acceptedRef.current) return Promise.resolve(true);
    if (pending.current) return pending.current;
    setSaving(true); setError(false);
    pending.current = AsyncStorage.setItem(LOCAL_DATA_NOTICE_KEY, 'accepted').then(() => {
      acceptedRef.current = true; setAccepted(true); return true;
    }).catch(() => { setError(true); return false; }).finally(() => {
      setSaving(false); pending.current = undefined;
    });
    return pending.current;
  }, []);
  const adoptLegacy = useCallback((value: boolean) => {
    if (value) void accept();
  }, [accept]);
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    const timer = setTimeout(() => { if (active) setReady(true); }, 1500);
    void (async () => {
      const stored = await readPreference(LOCAL_DATA_NOTICE_KEY);
      if (!active) return;
      if (stored === 'accepted') { acceptedRef.current = true; setAccepted(true); }
      else {
        const legacy = await Promise.allSettled([work.readDisclosureAcceptance?.(), expenses.readDisclosureAcceptance?.()]);
        if (active && legacy.some(result => result.status === 'fulfilled' && result.value === true)) await accept();
      }
      if (active) setReady(true);
    })();
    return () => { active = false; clearTimeout(timer); };
  }, [enabled, accept]);
  return { accepted, ready, saving, error, accept, adoptLegacy };
}
export type LocalDataNoticeState = ReturnType<typeof useNoticeState>;
const Context = createContext<LocalDataNoticeState | undefined>(undefined);
export function LocalDataNoticeProvider({ children }: PropsWithChildren) {
  const state = useNoticeState(true);
  return <Context.Provider value={state}>{children}</Context.Provider>;
}
export function useLocalDataNotice() {
  const shared = useContext(Context);
  const fallback = useNoticeState(!shared);
  return shared ?? fallback;
}
