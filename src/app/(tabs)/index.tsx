// صفحه‌ی خانه (به سبک Lingua): ادامه‌ی مرور، هدف امروز، دسترسی سریع
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ScreenScroll } from '@/components/screen';
import { leitnerDue, leitnerList } from '@/lib/api';
import { useAppTheme, type AppTheme } from '@/lib/theme-context';
import { dayKey, getActivity, getGoal, getLastWord, streakOf, type ActivityMap } from '@/lib/storage';

type HomeData = {
  due: number;
  total: number;
  lastWord: string | null;
  streak: number;
  todayReviews: number;
  goal: number;
};

const EMPTY: HomeData = { due: 0, total: 0, lastWord: null, streak: 0, todayReviews: 0, goal: 10 };

const TILES: { emoji: string; label: string; href: '/explore' | '/practice' | '/progress' }[] = [
  { emoji: '📖', label: 'دیکشنری', href: '/explore' },
  { emoji: '🔁', label: 'مرور لایتنر', href: '/practice' },
  { emoji: '📝', label: 'ترجمه متن', href: '/practice' },
  { emoji: '📊', label: 'پیشرفت من', href: '/progress' },
];

export default function HomeScreen() {
  const { colors, isDark } = useAppTheme();
  const styles = makeStyles(colors, isDark);
  const [data, setData] = useState<HomeData>(EMPTY);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        const [dueR, listR, activity, goal, lastWord] = await Promise.all([
          leitnerDue().catch(() => null),
          leitnerList().catch(() => null),
          getActivity().catch((): ActivityMap => ({})),
          getGoal().catch(() => 10),
          getLastWord().catch(() => null),
        ]);
        if (!alive) return;
        setData({
          due: dueR?.cards.length ?? 0,
          total: listR?.cards.length ?? 0,
          lastWord,
          streak: streakOf(activity),
          todayReviews: activity[dayKey()]?.reviews ?? 0,
          goal,
        });
      })();
      return () => {
        alive = false;
      };
    }, []),
  );

  const goalPct = Math.min(1, data.goal > 0 ? data.todayReviews / data.goal : 0);
  const hasDue = data.due > 0;

  return (
    <ScreenScroll showsVerticalScrollIndicator={false}>
        {/* سربرگ */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>سلام! 👋</Text>
            <Text style={styles.subtitle}>امروز چی می‌خوای یاد بگیری؟</Text>
          </View>
          <View style={styles.streakChip}>
            <Text style={styles.streakText}>🔥 {data.streak}</Text>
          </View>
        </View>

        {/* کارت ادامه */}
        <View style={styles.continueCard}>
          {hasDue ? (
            <>
              <Text style={styles.continueTitle}>📚 {data.due} کلمه منتظر مرورن</Text>
              {data.lastWord ? (
                <Text style={styles.continueSub}>
                  آخرین کلمه‌ات: <Text style={styles.lastWord}>{data.lastWord}</Text>
                </Text>
              ) : null}
              <Pressable style={styles.continueBtn} onPress={() => router.push('/practice')}>
                <Text style={styles.continueBtnText}>ادامه بده ←</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={styles.continueTitle}>🎉 مروری نداری</Text>
              <Text style={styles.continueSub}>یه کلمه‌ی تازه یاد بگیر و به جعبه‌ت اضافه‌ش کن.</Text>
              <Pressable style={styles.continueBtn} onPress={() => router.push('/explore')}>
                <Text style={styles.continueBtnText}>یادگیری کلمه‌ی تازه ←</Text>
              </Pressable>
            </>
          )}
        </View>

        {/* هدف امروز */}
        <View style={styles.card}>
          <View style={styles.goalHead}>
            <Text style={styles.cardTitle}>🎯 هدف امروز</Text>
            <Text style={styles.goalText}>
              {data.todayReviews} از {data.goal} مرور امروز
            </Text>
          </View>
          <View style={styles.barTrack}>
            <View style={[styles.barFill, { width: `${goalPct * 100}%` }]} />
          </View>
          {goalPct >= 1 ? <Text style={styles.goalDone}>آفرین! هدف امروز کامل شد 🏆</Text> : null}
        </View>

        {/* تمرین سریع */}
        <Text style={styles.sectionTitle}>تمرین سریع</Text>
        <View style={styles.grid}>
          {TILES.map((t) => (
            <Pressable key={t.label} style={styles.tile} onPress={() => router.push(t.href)}>
              <Text style={styles.tileEmoji}>{t.emoji}</Text>
              <Text style={styles.tileLabel}>{t.label}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.totalLine}>📦 تا حالا {data.total} کلمه توی جعبه‌ته</Text>
    </ScreenScroll>
  );
}

function makeStyles(colors: AppTheme['colors'], isDark: boolean) {
  return StyleSheet.create({
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    title: { fontSize: 26, fontWeight: '800', color: colors.ink },
    subtitle: { fontSize: 15, color: colors.secondary, marginTop: 4 },
    streakChip: {
      backgroundColor: isDark ? '#3A2E12' : '#FFF3E0',
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    streakText: { fontSize: 15, fontWeight: '700', color: isDark ? '#FFC95E' : '#E65100' },
    continueCard: {
      backgroundColor: colors.primary,
      borderRadius: colors.radius,
      padding: 20,
      marginTop: 20,
    },
    continueTitle: { fontSize: 19, fontWeight: '800', color: '#fff' },
    continueSub: { fontSize: 14, color: 'rgba(255,255,255,0.85)', marginTop: 6 },
    lastWord: { fontWeight: '700', color: '#fff', writingDirection: 'ltr' },
    continueBtn: {
      backgroundColor: '#fff',
      borderRadius: 999,
      paddingVertical: 10,
      paddingHorizontal: 18,
      alignSelf: 'flex-start',
      marginTop: 14,
    },
    continueBtnText: { color: colors.primaryDeep, fontSize: 15, fontWeight: '700' },
    card: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: colors.radius,
      padding: 18,
      marginTop: 16,
    },
    goalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    cardTitle: { fontSize: 16, fontWeight: '700', color: colors.ink },
    goalText: { fontSize: 13, color: colors.secondary },
    barTrack: {
      height: 10,
      borderRadius: 999,
      backgroundColor: colors.soft,
      marginTop: 12,
      overflow: 'hidden',
    },
    barFill: { height: '100%', borderRadius: 999, backgroundColor: colors.primary },
    goalDone: { fontSize: 13, fontWeight: '700', color: colors.success, marginTop: 10 },
    sectionTitle: { fontSize: 17, fontWeight: '800', color: colors.ink, marginTop: 24, marginBottom: 12 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    tile: {
      width: '48%',
      flexGrow: 1,
      backgroundColor: colors.soft,
      borderRadius: colors.radius,
      paddingVertical: 20,
      alignItems: 'center',
      gap: 8,
    },
    tileEmoji: { fontSize: 30 },
    tileLabel: { fontSize: 15, fontWeight: '700', color: colors.ink },
    totalLine: { fontSize: 14, color: colors.secondary, textAlign: 'center', marginTop: 24 },
  });
}
