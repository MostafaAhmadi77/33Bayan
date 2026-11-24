// اندازه‌ی چیدمان واکنش‌گرا برای وب. روی اندروید/iOS همیشه «compact» است
// تا رابط کاربری اپ موبایل هیچ تغییری نکند.
import { Platform, useWindowDimensions } from 'react-native';

export type LayoutSize = 'compact' | 'medium' | 'expanded';

export function useLayoutSize(): LayoutSize {
  const { width } = useWindowDimensions();
  if (Platform.OS !== 'web') return 'compact';
  if (width >= 1200) return 'expanded';
  if (width >= 840) return 'medium';
  return 'compact';
}
