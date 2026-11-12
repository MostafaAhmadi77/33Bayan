import { setAudioModeAsync } from 'expo-audio';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { I18nManager } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { AppThemeProvider, useAppTheme } from '@/lib/theme-context';

SplashScreen.preventAutoHideAsync();

function ThemedLayout() {
  const { isDark } = useAppTheme();

  // رابط کاربری فارسی است: چیدمان راست‌به‌چپ
  useEffect(() => {
    I18nManager.allowRTL(true);
    if (!I18nManager.isRTL) I18nManager.forceRTL(true);
  }, []);

  // تلفظ باید حتی وقتی گوشی روی سایلنت است هم پخش شود
  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
  }, []);

  return (
    <ThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <AppTabs />
    </ThemeProvider>
  );
}

export default function TabLayout() {
  return (
    <AppThemeProvider>
      <ThemedLayout />
    </AppThemeProvider>
  );
}
