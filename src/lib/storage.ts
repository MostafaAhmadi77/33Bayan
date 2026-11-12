// ذخیره‌سازی روی دستگاه: شناسه‌ی کاربر، آمار فعالیت روزانه (برای XP و روزهای متوالی)،
// هدف روزانه، جست‌وجوهای اخیر و آخرین کلمه
import AsyncStorage from '@react-native-async-storage/async-storage';

const UID_KEY = 'bayan:uid';
const ACTIVITY_KEY = 'bayan:activity';
const GOAL_KEY = 'bayan:goal';
const RECENT_KEY = 'bayan:recent';
const LAST_KEY = 'bayan:lastWord';

export async function getUid(): Promise<string> {
  let uid = await AsyncStorage.getItem(UID_KEY);
  if (!uid) {
    uid = `dev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    await AsyncStorage.setItem(UID_KEY, uid);
  }
  return uid;
}

export const dayKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export type DayActivity = { reviews: number; adds: number };
export type ActivityMap = Record<string, DayActivity>;

export async function getActivity(): Promise<ActivityMap> {
  try {
    return JSON.parse((await AsyncStorage.getItem(ACTIVITY_KEY)) || '{}');
  } catch {
    return {};
  }
}

export async function logActivity(kind: 'review' | 'add') {
  const map = await getActivity();
  const k = dayKey();
  const cur = map[k] || { reviews: 0, adds: 0 };
  if (kind === 'review') cur.reviews += 1;
  else cur.adds += 1;
  map[k] = cur;
  await AsyncStorage.setItem(ACTIVITY_KEY, JSON.stringify(map));
}

/** روزهای متوالی تا امروز (اگه امروز هنوز مروری نشده، از دیروز حساب می‌شود) */
export function streakOf(map: ActivityMap): number {
  let streak = 0;
  const d = new Date();
  if (!map[dayKey(d)]?.reviews) d.setDate(d.getDate() - 1);
  while (map[dayKey(d)]?.reviews) {
    streak += 1;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

export async function getGoal(): Promise<number> {
  const g = Number(await AsyncStorage.getItem(GOAL_KEY));
  return [5, 10, 20].includes(g) ? g : 10;
}

export const setGoal = (g: number) => AsyncStorage.setItem(GOAL_KEY, String(g));

export async function getRecent(): Promise<string[]> {
  try {
    return JSON.parse((await AsyncStorage.getItem(RECENT_KEY)) || '[]');
  } catch {
    return [];
  }
}

export async function pushRecent(word: string) {
  const list = (await getRecent()).filter((w) => w !== word);
  list.unshift(word);
  await AsyncStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, 8)));
}

export async function getLastWord(): Promise<string | null> {
  return AsyncStorage.getItem(LAST_KEY);
}

export const setLastWord = (w: string) => AsyncStorage.setItem(LAST_KEY, w);

// تم نمایش (روشن/تیره/سیستم) — نوع اینجا تعریف می‌شود تا theme-context بدون
// چرخه‌ی import از آن استفاده کند (storage هرگز theme-context را import نمی‌کند)
export type ThemeMode = 'light' | 'dark' | 'system';
export const THEME_KEY = 'bayan:theme';

export async function getThemeMode(): Promise<ThemeMode> {
  try {
    const v = await AsyncStorage.getItem(THEME_KEY);
    return v === 'light' || v === 'dark' || v === 'system' ? v : 'system';
  } catch {
    return 'system';
  }
}

export const setThemeMode = (m: ThemeMode) => AsyncStorage.setItem(THEME_KEY, m);

/** پاک کردن همه‌ی جست‌وجوهای اخیر */
export async function clearRecent(): Promise<void> {
  await AsyncStorage.removeItem(RECENT_KEY);
}
