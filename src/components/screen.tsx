// پوسته‌ی مشترک همه‌ی صفحه‌ها: فاصله‌ی امن از بالای صفحه (زیر نوار وضعیت)
// و محدود کردن عرض محتوا روی صفحه‌های پهن (تبلت) تا لبه‌به‌لبه کشیده نشود.
import type { ReactNode } from 'react';
import { ScrollView, type ScrollViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useLayoutSize } from '@/hooks/use-layout';
import { useAppTheme } from '@/lib/theme-context';

export function ScreenScroll({
  children,
  contentContainerStyle,
  ...props
}: ScrollViewProps & { children: ReactNode }) {
  const { colors } = useAppTheme();
  const size = useLayoutSize();
  const maxWidth = size === 'expanded' ? 1120 : size === 'medium' ? 920 : 760;
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <ScrollView
        {...props}
        contentContainerStyle={[
          {
            padding: 20,
            paddingBottom: 28,
            width: '100%',
            maxWidth,
            paddingHorizontal: size === 'compact' ? 20 : 32,
            alignSelf: 'center',
            flexGrow: 1,
          },
          contentContainerStyle,
        ]}>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}
