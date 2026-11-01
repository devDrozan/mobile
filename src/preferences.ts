import AsyncStorage from '@react-native-async-storage/async-storage';

// Preference reads must never block the interface. A store that neither resolves
// nor rejects (locked or corrupt storage) would otherwise trap the launch screen,
// so fall back to the documented defaults after a short wait.
export const PREFERENCE_TIMEOUT_MS = 1500;

export async function readPreference(key: string) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const fallback = new Promise<null>(resolve => { timer = setTimeout(() => resolve(null), PREFERENCE_TIMEOUT_MS); });
  try {
    return await Promise.race([AsyncStorage.getItem(key).catch(() => null), fallback]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
