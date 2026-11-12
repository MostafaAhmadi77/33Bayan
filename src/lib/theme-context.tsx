// تم نمایش اپ: روشن / تیره / سیستم — انتخاب کاربر در AsyncStorage ذخیره می‌شود
// و «سیستم» یعنی دنباله‌روی تم سیستم‌عامل (useColorScheme).
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { DarkBrand, LightBrand, type ThemeColors } from '@/constants/theme';
import { getThemeMode, setThemeMode, type ThemeMode } from '@/lib/storage';

export type { ThemeMode } from '@/lib/storage';

export type AppTheme = {
  mode: ThemeMode;
  setMode: (m: ThemeMode) => Promise<void>;
  isDark: boolean;
  colors: ThemeColors;
};

const AppThemeContext = createContext<AppTheme>({
  mode: 'system',
  setMode: async () => {},
  isDark: false,
  colors: LightBrand,
});

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');

  useEffect(() => {
    let active = true;
    getThemeMode()
      .then((m) => {
        if (active) setModeState(m);
      })
      .catch(() => {
        // خواندن ذخیره‌سازی ناموفق بود؛ روی «سیستم» می‌مانیم
      });
    return () => {
      active = false;
    };
  }, []);

  const setMode = useCallback(async (m: ThemeMode) => {
    setModeState(m);
    try {
      await setThemeMode(m);
    } catch {
      // ذخیره ناموفق بود؛ حالت در حافظه اعمال شده و می‌ماند
    }
  }, []);

  const isDark = mode === 'dark' || (mode === 'system' && systemScheme === 'dark');

  const value = useMemo<AppTheme>(
    () => ({ mode, setMode, isDark, colors: isDark ? DarkBrand : LightBrand }),
    [mode, setMode, isDark],
  );

  return <AppThemeContext.Provider value={value}>{children}</AppThemeContext.Provider>;
}

export function useAppTheme(): AppTheme {
  return useContext(AppThemeContext);
}
