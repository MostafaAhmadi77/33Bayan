// صفحه‌ی پروفایل: سربرگ 33Bayan، هدف روزانه، تم نمایش و فهرست واژگان لایتنر (با حذف)
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ScreenScroll } from '@/components/screen';
import { type ThemeColors } from '@/constants/theme';
import { leitnerList, leitnerRemove, type LeitnerCard } from '@/lib/api';
import {
  getExampleCount,
  getExampleLevel,
  getGoal,
  setExampleCount,
  setExampleLevel,
  setGoal,
  type ExampleLevel,
  type ThemeMode,
} from '@/lib/storage';
import { useAppTheme } from '@/lib/theme-context';

const faNum = (n: number) => n.toLocaleString('fa-IR');
const GOALS = [5, 10, 20] as const;
const EX_COUNTS = [1, 2, 3, 4, 5] as const;
const EX_LEVELS = [
  { value: 'A1', label: 'A1 مبتدی' },
  { value: 'A2', label: 'A2 مقدماتی' },
  { value: 'B1', label: 'B1 متوسط' },
  { value: 'B2', label: 'B2 بالاتر از متوسط' },
  { value: 'C1', label: 'C1 پیشرفته' },
] as const;
const THEME_MODES = [
  { value: 'light', label: '☀️ روشن' },
  { value: 'dark', label: '🌙 تیره' },
  { value: 'system', label: '⚙️ سیستم' },
] as const;

export default function ProfileScreen() {
  const { colors, mode, setMode } = useAppTheme();
  const styles = makeStyles(colors);
  const [cards, setCards] = useState<LeitnerCard[]>([]);
  const [goal, setGoalState] = useState<number>(10);
  const [exCount, setExCountState] = useState<number>(2);
  const [exLevel, setExLevelState] = useState<ExampleLevel>('B1');

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        const [list, g, c, l] = await Promise.all([
          leitnerList().catch(() => ({ ok: false, cards: [] as LeitnerCard[] })),
          getGoal().catch(() => 10),
          getExampleCount().catch(() => 2),
          getExampleLevel().catch((): ExampleLevel => 'B1'),
        ]);
        if (!active) return;
        setCards(list.cards || []);
        setGoalState(g);
        setExCountState(c);
        setExLevelState(l);
      })();
      return () => {
        active = false;
      };
    }, []),
  );

  const pickGoal = async (g: number) => {
    setGoalState(g);
    await setGoal(g).catch(() => {});
  };

  const pickExCount = async (n: number) => {
    setExCountState(n);
    await setExampleCount(n).catch(() => {});
  };

  const pickExLevel = async (l: ExampleLevel) => {
    setExLevelState(l);
    await setExampleLevel(l).catch(() => {});
  };

  const pickMode = (m: ThemeMode) => {
    void setMode(m).catch(() => {});
  };

  const remove = async (id: string) => {
    try {
      await leitnerRemove(id);
      setCards((prev) => prev.filter((c) => c.id !== id));
    } catch {
      // حذف ناموفق بود؛ کارت در فهرست می‌ماند تا کاربر دوباره تلاش کند
    }
  };

  const now = Date.now();

  return (
    <ScreenScroll>
      <Text style={styles.title}>پروفایل</Text>

      {/* سربرگ */}
      <View style={styles.headerCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>33</Text>
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.appName}>33Bayan</Text>
          <Text style={styles.appSub}>دیکشنری آلمانی ⇄ فارسی + جعبه‌ی لایتنر</Text>
        </View>
      </View>

      {/* هدف روزانه */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>🎯 هدف روزانه</Text>
        <View style={styles.goalRow}>
          {GOALS.map((g) => (
            <Pressable key={g} onPress={() => pickGoal(g)}>
              <Text style={[styles.goalChip, goal === g && styles.goalChipActive]}>
                {faNum(g)} مرور
              </Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.cardSub}>هر روز {faNum(goal)} مرور، هدف امروز توست.</Text>
      </View>

      {/* تم نمایش */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>🌙 تم نمایش</Text>
        <View style={styles.goalRow}>
          {THEME_MODES.map((t) => (
            <Pressable key={t.value} onPress={() => pickMode(t.value)}>
              <Text style={[styles.goalChip, mode === t.value && styles.goalChipActive]}>
                {t.label}
              </Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.cardSub}>
          {mode === 'system'
            ? 'تم با تنظیمات سیستم گوشی هماهنگ می‌شود.'
            : mode === 'dark'
              ? 'تم تیره فعال است.'
              : 'تم روشن فعال است.'}
        </Text>
      </View>

      {/* مثال‌ها: تعداد و سطح */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>💬 مثال‌ها</Text>
        <Text style={styles.cardSub}>تعداد مثال‌ها در هر کلمه:</Text>
        <View style={[styles.goalRow, styles.chipRowGap]}>
          {EX_COUNTS.map((n) => (
            <Pressable key={n} onPress={() => pickExCount(n)}>
              <Text style={[styles.goalChip, exCount === n && styles.goalChipActive]}>
                {faNum(n)}
              </Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.cardSub}>سطح من (مثال‌های ساخته‌شده با همین سطح می‌آیند):</Text>
        <View style={[styles.goalRow, styles.levelRow]}>
          {EX_LEVELS.map((l) => (
            <Pressable key={l.value} onPress={() => pickExLevel(l.value)}>
              <Text style={[styles.goalChip, exLevel === l.value && styles.goalChipActive]}>
                {l.label}
              </Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.cardSub}>
          هر کلمه {faNum(exCount)} مثال می‌گیرد؛ اگر مثال آماده کمتر بود، بقیه در سطح {exLevel} ساخته می‌شوند.
        </Text>
      </View>

      {/* واژگان من */}
      <Text style={styles.sectionTitle}>📦 واژگان من ({faNum(cards.length)})</Text>
      {cards.length === 0 ? (
        <View style={styles.card}>
          <Text style={styles.emptyText}>هنوز کلمه‌ای اضافه نکردی — از بخش جست‌وجو شروع کن.</Text>
        </View>
      ) : (
        cards.map((c) => (
          <View key={c.id} style={styles.wordRow}>
            <View style={styles.wordInfo}>
              <Text style={styles.word} selectable>
                {c.entry.speak || c.word}
              </Text>
              {c.entry.persian ? <Text style={styles.wordFa}>{c.entry.persian}</Text> : null}
              <View style={styles.wordChips}>
                <Text style={styles.miniChip}>خانه‌ی {faNum(c.box)}</Text>
                {c.nextReviewAt <= now ? (
                  <Text style={[styles.miniChip, styles.dueChip]}>⏰ رسیده</Text>
                ) : null}
              </View>
            </View>
            <Pressable onPress={() => remove(c.id)} hitSlop={8} style={styles.deleteBtn}>
              <Text style={styles.deleteText}>🗑</Text>
            </Pressable>
          </View>
        ))
      )}
    </ScreenScroll>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    title: { fontSize: 26, fontWeight: '800', color: c.ink, marginBottom: 16 },
    headerCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      backgroundColor: c.soft,
      borderRadius: c.radius,
      padding: 16,
      marginBottom: 14,
    },
    avatar: {
      width: 58,
      height: 58,
      borderRadius: 29,
      backgroundColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: { color: '#fff', fontSize: 22, fontWeight: '800' },
    headerInfo: { flex: 1 },
    appName: { fontSize: 20, fontWeight: '800', color: c.ink, writingDirection: 'ltr', textAlign: 'left' },
    appSub: { fontSize: 13, color: c.secondary, marginTop: 3 },
    card: {
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: c.radius,
      padding: 16,
      marginBottom: 14,
    },
    cardTitle: { fontSize: 16, fontWeight: '700', color: c.ink, marginBottom: 10 },
    cardSub: { fontSize: 13, color: c.secondary, marginTop: 10 },
    chipRowGap: { marginTop: 8 },
    goalRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    levelRow: { marginTop: 8 },
    goalChip: {
      backgroundColor: c.chip,
      color: c.primaryDeep,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 999,
      fontSize: 14,
      fontWeight: '700',
      overflow: 'hidden',
    },
    goalChipActive: { backgroundColor: c.primary, color: '#fff' },
    sectionTitle: { fontSize: 18, fontWeight: '800', color: c.ink, marginBottom: 10, marginTop: 4 },
    emptyText: { fontSize: 14, color: c.secondary, lineHeight: 22 },
    wordRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 16,
      padding: 12,
      marginBottom: 10,
      backgroundColor: c.card,
    },
    wordInfo: { flex: 1 },
    word: { fontSize: 17, fontWeight: '700', color: c.ink, writingDirection: 'ltr', textAlign: 'left' },
    wordFa: { fontSize: 14, color: c.primaryDeep, marginTop: 2 },
    wordChips: { flexDirection: 'row', gap: 6, marginTop: 6 },
    miniChip: {
      backgroundColor: c.chip,
      color: c.primaryDeep,
      paddingHorizontal: 9,
      paddingVertical: 3,
      borderRadius: 999,
      fontSize: 11,
      fontWeight: '600',
      overflow: 'hidden',
    },
    dueChip: { backgroundColor: '#FFF3D6', color: '#9A6B00' },
    deleteBtn: { padding: 6 },
    deleteText: { fontSize: 18 },
  });
