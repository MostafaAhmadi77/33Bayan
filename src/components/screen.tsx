// پوسته‌ی مشترک همه‌ی صفحه‌ها: فاصله‌ی امن از بالای صفحه (زیر نوار وضعیت)
// و محدود کردن عرض محتوا روی صفحه‌های پهن (تبلت) تا لبه‌به‌لبه کشیده نشود.
import type { ReactNode } from 'react';
import { ScrollView, type ScrollViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export function ScreenScroll({
  children,
  contentContainerStyle,
  ...props
}: ScrollViewProps & { children: ReactNode }) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top']}>
      <ScrollView
        {...props}
        contentContainerStyle={[
          {
            padding: 20,
            paddingBottom: 28,
            width: '100%',
            maxWidth: 760,
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
