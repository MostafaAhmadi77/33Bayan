/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://unistyl.es/), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#000000',
    background: '#ffffff',
    backgroundElement: '#F0F0F3',
    backgroundSelected: '#E0E1E6',
    textSecondary: '#60646C',
  },
  dark: {
    text: '#ffffff',
    background: '#000000',
    backgroundElement: '#212225',
    backgroundSelected: '#2E3135',
    textSecondary: '#B0B4BA',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;

/** پالت برند 33Bayan (به سبک طرح Lingua: بنفش روی سفید) */
export const Brand = {
  primary: '#7B61FF',
  primaryDeep: '#6A4DF0',
  soft: '#F6F4FF',
  chip: '#EFEAFF',
  ink: '#26264A',
  secondary: '#8A8CA8',
  border: '#ECEAF6',
  success: '#34C77B',
  amber: '#FFB020',
  danger: '#FF5A5A',
  radius: 20,
} as const;

/** رنگ‌های تم (روشن/تیره) که همه‌ی صفحه‌ها از طریق useAppTheme می‌گیرند */
export type ThemeColors = {
  primary: string;
  primaryDeep: string;
  soft: string;
  chip: string;
  ink: string;
  secondary: string;
  border: string;
  success: string;
  amber: string;
  danger: string;
  radius: number;
  background: string;
  surface: string;
  card: string;
  /** کارت شیشه‌ای (روشن: سفید با سایه؛ تیره: سفیدِ شفاف) */
  glass: string;
  glassBorder: string;
  /** چیپِ بنفشِ کم‌رنگ داخل کارت شیشه‌ای + چیپِ سبزِ جمع */
  chipTint: string;
  chipTintText: string;
  chipGreen: string;
  chipGreenText: string;
};

export const LightBrand: ThemeColors = {
  ...Brand,
  background: '#FFFFFF',
  surface: '#FFFFFF',
  card: '#FFFFFF',
  glass: '#FFFFFF',
  glassBorder: '#ECEAF6',
  chipTint: '#EFEAFF',
  chipTintText: '#6A4DF0',
  chipGreen: '#E3F8EE',
  chipGreenText: '#1E7A4C',
};

export const DarkBrand: ThemeColors = {
  // تم «Berlin bei Nacht»: آسمان شب بنفش با ستاره‌ها و خط افق برلین در پس‌زمینه
  primary: '#8B76FF',
  primaryDeep: '#A99CFF',
  soft: '#1A1B33',
  chip: '#25264A',
  ink: '#F4F4FA',
  secondary: '#A3A4C4',
  border: 'rgba(255,255,255,0.12)',
  success: '#34C77B',
  amber: '#FFB020',
  danger: '#FF5A5A',
  radius: 20,
  background: '#0E1022',
  surface: '#1A1B33',
  card: 'rgba(30,30,55,0.78)',
  glass: 'rgba(255,255,255,0.07)',
  glassBorder: 'rgba(255,255,255,0.14)',
  chipTint: 'rgba(124,108,255,0.22)',
  chipTintText: '#CFC4FF',
  chipGreen: 'rgba(64,200,150,0.16)',
  chipGreenText: '#8FE8C4',
};

