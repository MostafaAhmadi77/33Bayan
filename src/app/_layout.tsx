import { setAudioModeAsync } from 'expo-audio';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { I18nManager, useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';

SplashScreen.preventAutoHideAsync();

export default function TabLayout() {
  const colorScheme = useColorScheme();

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
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <AppTabs />
    </ThemeProvider>
  );
}
