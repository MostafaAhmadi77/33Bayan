// نسخه‌ی وب نوار تب: کپی ظاهری NativeTabs اندروید (نوار پایینِ متریال ۳)
// تا رابط کاربری وب دقیقاً مثل اپ اندروید باشد. روی صفحه‌های پهن (≥ 840px)
// مثل اپ‌های اندروید روی تبلت، نوار به «ریل ناوبری» کنار صفحه تبدیل می‌شود.
import { Tabs, TabList, TabTrigger, TabSlot, TabTriggerSlotProps, TabListProps } from 'expo-router/ui';
import { Image, Pressable, Text, View, StyleSheet, type ImageSourcePropType } from 'react-native';

import { useLayoutSize } from '@/hooks/use-layout';
import { useAppTheme } from '@/lib/theme-context';

const ICONS: Record<string, ImageSourcePropType> = {
  index: require('@/assets/images/tabIcons/home.png'),
  explore: require('@/assets/images/tabIcons/explore.png'),
  practice: require('@/assets/images/tabIcons/practice.png'),
  progress: require('@/assets/images/tabIcons/progress.png'),
  profile: require('@/assets/images/tabIcons/profile.png'),
};

export default function AppTabs() {
  const { colors } = useAppTheme();
  const rail = useLayoutSize() !== 'compact';
  return (
    <Tabs style={{ flex: 1, flexDirection: rail ? 'row' : 'column', backgroundColor: colors.background }}>
      {!rail && <TabSlot style={{ flex: 1 }} />}
      <TabList asChild>
        <BottomBar rail={rail}>
          <TabTrigger name="index" href="/" asChild>
            <TabButton icon="index">خانه</TabButton>
          </TabTrigger>
          <TabTrigger name="explore" href="/explore" asChild>
            <TabButton icon="explore">جست‌وجو</TabButton>
          </TabTrigger>
          <TabTrigger name="practice" href="/practice" asChild>
            <TabButton icon="practice">تمرین</TabButton>
          </TabTrigger>
          <TabTrigger name="progress" href="/progress" asChild>
            <TabButton icon="progress">پیشرفت</TabButton>
          </TabTrigger>
          <TabTrigger name="profile" href="/profile" asChild>
            <TabButton icon="profile">پروفایل</TabButton>
          </TabTrigger>
        </BottomBar>
      </TabList>
      {rail && <TabSlot style={{ flex: 1 }} />}
    </Tabs>
  );
}

export function TabButton({
  children,
  isFocused,
  icon,
  ...props
}: TabTriggerSlotProps & { icon: keyof typeof ICONS }) {
  const { colors } = useAppTheme();
  const rail = useLayoutSize() !== 'compact';
  const tint = isFocused ? colors.ink : colors.secondary;
  return (
    <Pressable {...(props as any)} style={[styles.item, rail && styles.railItem]}>
      <View style={[styles.indicator, { backgroundColor: isFocused ? colors.chip : 'transparent' }]}>
        <Image source={ICONS[icon]} style={[styles.icon, { tintColor: tint }]} />
      </View>
      <Text style={[styles.label, { color: tint, fontWeight: isFocused ? '700' : '500' }]}>{children}</Text>
    </Pressable>
  );
}

export function BottomBar({ rail, ...props }: TabListProps & { rail?: boolean }) {
  const { colors } = useAppTheme();
  return (
    <View
      {...props}
      style={[
        rail ? styles.rail : styles.bar,
        { backgroundColor: colors.background, borderColor: colors.border },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    height: 80,
    paddingTop: 12,
    paddingBottom: 16,
    paddingHorizontal: 8,
  },
  rail: {
    width: 88,
    paddingTop: 44,
    gap: 12,
    alignItems: 'stretch',
    borderLeftWidth: 1,
  },
  railItem: { flexGrow: 0, flexBasis: 'auto', paddingVertical: 4 },
  item: { flexGrow: 1, flexBasis: 0, alignItems: 'center', gap: 4, cursor: 'pointer' } as any,
  indicator: {
    width: 64,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { width: 24, height: 24 },
  label: { fontSize: 12, letterSpacing: 0.5 },
});
