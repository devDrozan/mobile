import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { darkColors, lightColors, type ThemeColors } from './theme-colors';

export type ThemeMode = 'system' | 'light' | 'dark';
type AppTheme = {
  mode: ThemeMode;
  resolvedTheme: 'light' | 'dark';
  colors: ThemeColors;
  setMode: (mode: ThemeMode) => void;
};
const preferenceKey = 'e9-theme';
const ThemeContext = createContext<AppTheme>({ mode: 'system', resolvedTheme: 'light', colors: lightColors, setMode: () => undefined });
const validMode = (value: string | null): value is ThemeMode => value === 'system' || value === 'light' || value === 'dark';

export function AppThemeProvider({ children }: PropsWithChildren) {
  const systemScheme = useColorScheme();
  const [mode, setStoredMode] = useState<ThemeMode>('system');
  const userSelectedRef = useRef(false);

  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(preferenceKey).then(value => {
      if (active && !userSelectedRef.current && validMode(value)) setStoredMode(value);
    }).catch(() => { /* Appearance still works when device storage is unavailable. */ });
    return () => { active = false; };
  }, []);

  const setMode = useCallback((next: ThemeMode) => {
    userSelectedRef.current = true;
    setStoredMode(next);
    void AsyncStorage.setItem(preferenceKey, next).catch(() => { /* Saving this preference is optional. */ });
  }, []);

  const resolvedTheme = mode === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : mode;
  const value = useMemo<AppTheme>(() => ({
    mode, resolvedTheme, colors: resolvedTheme === 'dark' ? darkColors : lightColors, setMode,
  }), [mode, resolvedTheme, setMode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme() { return useContext(ThemeContext); }
