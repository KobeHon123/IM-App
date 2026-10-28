import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Appearance, useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, ColorScheme, ThemeColors } from '@/constants/Colors';

export type ThemeMode = 'system' | 'light' | 'dark';

interface ThemeContextType {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  scheme: ColorScheme;
  isDark: boolean;
  colors: ThemeColors;
}

const STORAGE_KEY = 'theme_mode';

const ThemeContext = createContext<ThemeContextType>({
  mode: 'system',
  setMode: () => {},
  scheme: 'light',
  isDark: false,
  colors: Colors.light,
});

const applyMode = (mode: ThemeMode) => {
  Appearance.setColorScheme(mode === 'system' ? 'auto' : mode);
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setModeState] = useState<ThemeMode>('system');
  const systemScheme = useColorScheme();

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then(stored => {
        if (stored === 'light' || stored === 'dark' || stored === 'system') {
          setModeState(stored);
          applyMode(stored);
        }
      })
      .catch(() => {});
  }, []);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    applyMode(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
  }, []);

  const scheme: ColorScheme = mode === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : mode;

  const value = useMemo<ThemeContextType>(
    () => ({ mode, setMode, scheme, isDark: scheme === 'dark', colors: Colors[scheme] }),
    [mode, setMode, scheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => useContext(ThemeContext);

export const useColors = (): ThemeColors => useContext(ThemeContext).colors;
