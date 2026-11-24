// نسخه‌ی وب نوار تب: کپی ظاهری NativeTabs اندروید (نوار پایینِ متریال ۳)
// تا رابط کاربری وب دقیقاً مثل اپ اندروید باشد.
import { Tabs, TabList, TabTrigger, TabSlot, TabTriggerSlotProps, TabListProps } from 'expo-router/ui';
import { Image, Pressable, Text, View, StyleSheet, type ImageSourcePropType } from 'react-native';

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
  return (
    <Tabs style={{ flex: 1, backgroundColor: colors.background }}>
      <TabSlot style={{ flex: 1 }} />
      <TabList asChild>
        <BottomBar>
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
  const tint = isFocused ? colors.ink : colors.secondary;
  return (
    <Pressable {...(props as any)} style={styles.item}>
      <View style={[styles.indicator, { backgroundColor: isFocused ? colors.chip : 'transparent' }]}>
        <Image source={ICONS[icon]} style={[styles.icon, { tintColor: tint }]} />
      </View>
      <Text style={[styles.label, { color: tint, fontWeight: isFocused ? '700' : '500' }]}>{children}</Text>
    </Pressable>
  );
}

export function BottomBar(props: TabListProps) {
  const { colors } = useAppTheme();
  return <View {...props} style={[styles.bar, { backgroundColor: colors.background }]} />;
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    height: 80,
    paddingTop: 12,
    paddingBottom: 16,
    paddingHorizontal: 8,
  },
  item: { flex: 1, alignItems: 'center', gap: 4, cursor: 'pointer' } as any,
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
