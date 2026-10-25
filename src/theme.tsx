import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { darkColors, lightColors, type ThemeColors } from './theme-colors';

export type ThemeMode = 'system' | 'light' | 'dark';
type AppTheme = {
  ready: boolean;
  mode: ThemeMode;
  resolvedTheme: 'light' | 'dark';
  colors: ThemeColors;
  setMode: (mode: ThemeMode) => void;
};
const preferenceKey = 'e9-theme';
const ThemeContext = createContext<AppTheme>({ ready: false, mode: 'system', resolvedTheme: 'light', colors: lightColors, setMode: () => undefined });
const validMode = (value: string | null): value is ThemeMode => value === 'system' || value === 'light' || value === 'dark';

export function AppThemeProvider({ children }: PropsWithChildren) {
  const systemScheme = useColorScheme();
  const [mode, setStoredMode] = useState<ThemeMode>('system');
  const [ready, setReady] = useState(false);
  const userSelectedRef = useRef(false);

  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(preferenceKey).then(value => {
      if (active && !userSelectedRef.current && validMode(value)) setStoredMode(value);
    }).catch(() => { /* Appearance still works when device storage is unavailable. */ })
      .finally(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, []);

  const setMode = useCallback((next: ThemeMode) => {
    userSelectedRef.current = true;
    setStoredMode(next);
    void AsyncStorage.setItem(preferenceKey, next).catch(() => { /* Saving this preference is optional. */ });
  }, []);

  const resolvedTheme = mode === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : mode;
  const value = useMemo<AppTheme>(() => ({
    ready, mode, resolvedTheme, colors: resolvedTheme === 'dark' ? darkColors : lightColors, setMode,
  }), [ready, mode, resolvedTheme, setMode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme() { return useContext(ThemeContext); }
