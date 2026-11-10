// صفحه‌ی پیشرفت: XP، روزهای پیاپی، توزیع کلمات بین خانه‌های لایتنر،
// نمودار مرور ۷ روز اخیر و نشان‌های افتخار
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Brand } from '@/constants/theme';
import { leitnerList, type LeitnerCard } from '@/lib/api';
import { dayKey, getActivity, streakOf, type ActivityMap } from '@/lib/storage';

const faNum = (n: number) => n.toLocaleString('fa-IR');

export default function ProgressScreen() {
  const [activity, setActivity] = useState<ActivityMap>({});
  const [cards, setCards] = useState<LeitnerCard[]>([]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        const [map, list] = await Promise.all([
          getActivity().catch(() => ({}) as ActivityMap),
          leitnerList().catch(() => ({ ok: false, cards: [] as LeitnerCard[] })),
        ]);
        if (!active) return;
        setActivity(map);
        setCards(list.cards || []);
      })();
      return () => {
        active = false;
      };
    }, []),
  );

  const days = Object.values(activity);
  const totalReviews = days.reduce((s, d) => s + (d.reviews || 0), 0);
  const totalAdds = days.reduce((s, d) => s + (d.adds || 0), 0);
  const xp = totalReviews * 10 + totalAdds * 5;
  const streak = streakOf(activity);

  const total = cards.length;
  const now = Date.now();
  const due = cards.filter((c) => c.nextReviewAt <= now).length;
  const boxCounts = [1, 2, 3, 4, 5].map((b) => cards.filter((c) => c.box === b).length);
  const maxBox = Math.max(1, ...boxCounts);

  // ۷ روز اخیر، از قدیمی‌ترین تا امروز
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return { date: d, reviews: activity[dayKey(d)]?.reviews || 0 };
  });
  const maxWeek = Math.max(1, ...week.map((w) => w.reviews));

  const achievements = [
    { emoji: '🌱', title: 'اولین کلمه', unlocked: total >= 1 },
    { emoji: '📚', title: '۱۰ کلمه', unlocked: total >= 10 },
    { emoji: '🏆', title: '۵۰ کلمه', unlocked: total >= 50 },
    { emoji: '🔥', title: '۳ روز پیاپی', unlocked: streak >= 3 },
    { emoji: '⚡', title: '۷ روز پیاپی', unlocked: streak >= 7 },
    { emoji: '🎯', title: 'رسیدن به خانه‌ی ۵', unlocked: cards.some((c) => c.box === 5) },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>پیشرفت من</Text>

      {/* XP */}
      <View style={styles.xpCard}>
        <Text style={styles.xpText}>⭐ {faNum(xp)} XP</Text>
        <Text style={styles.xpSub}>
          {faNum(totalReviews)} مرور • {faNum(totalAdds)} کلمه‌ی اضافه‌شده
        </Text>
      </View>

      {/* روزهای پیاپی */}
      <View style={styles.card}>
        <Text style={styles.streakText}>🔥 {faNum(streak)} روز پیاپی</Text>
        <Text style={styles.cardSub}>هر روز دست‌کم یک مرور، زنجیره را نگه می‌دارد.</Text>
      </View>

      {/* خلاصه‌ی جعبه */}
      <View style={styles.chips}>
        <Text style={styles.chip}>📦 {faNum(total)} کلمه در جعبه</Text>
        <Text style={[styles.chip, due > 0 && styles.chipDue]}>⏰ {faNum(due)} کلمه آماده‌ی مرور</Text>
      </View>

      {/* توزیع خانه‌ها */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>جعبه‌ی لایتنر</Text>
        {boxCounts.map((count, i) => (
          <View key={i} style={styles.boxRow}>
            <Text style={styles.boxLabel}>خانه‌ی {faNum(i + 1)}</Text>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.barFill,
                  { width: `${(count / maxBox) * 100}%` },
                  i === 4 && { backgroundColor: Brand.success },
                ]}
              />
            </View>
            <Text style={styles.boxCount}>{faNum(count)}</Text>
          </View>
        ))}
      </View>

      {/* ۷ روز اخیر */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>مرورهای ۷ روز اخیر</Text>
        <View style={styles.weekRow}>
          {week.map((w, i) => (
            <View key={i} style={styles.weekCol}>
              <Text style={styles.weekValue}>{w.reviews ? faNum(w.reviews) : ''}</Text>
              <View
                style={[
                  styles.weekBar,
                  { height: 6 + (w.reviews / maxWeek) * 54 },
                  i === 6 && { backgroundColor: Brand.primary },
                ]}
              />
              <Text style={styles.weekDay}>{faNum(w.date.getDate())}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* نشان‌ها */}
      <Text style={styles.sectionTitle}>نشان‌ها</Text>
      <View style={styles.achGrid}>
        {achievements.map((a) => (
          <View key={a.title} style={[styles.achCard, !a.unlocked && styles.achLocked]}>
            <Text style={[styles.achEmoji, !a.unlocked && { opacity: 0.3 }]}>{a.emoji}</Text>
            <Text style={[styles.achTitle, !a.unlocked && { color: Brand.secondary }]}>{a.title}</Text>
            <Text style={styles.achState}>{a.unlocked ? 'باز شده ✅' : 'قفل 🔒'}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 26, fontWeight: '800', color: Brand.ink, marginBottom: 16 },
  xpCard: {
    backgroundColor: Brand.primary,
    borderRadius: Brand.radius,
    padding: 20,
    marginBottom: 14,
  },
  xpText: { fontSize: 30, fontWeight: '800', color: '#fff' },
  xpSub: { fontSize: 14, color: 'rgba(255,255,255,0.85)', marginTop: 6 },
  card: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: Brand.border,
    borderRadius: Brand.radius,
    padding: 16,
    marginBottom: 14,
  },
  streakText: { fontSize: 20, fontWeight: '800', color: Brand.ink },
  cardSub: { fontSize: 13, color: Brand.secondary, marginTop: 4 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: Brand.ink, marginBottom: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  chip: {
    backgroundColor: Brand.chip,
    color: Brand.primaryDeep,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    fontSize: 13,
    fontWeight: '600',
    overflow: 'hidden',
  },
  chipDue: { backgroundColor: '#FFF3D6', color: '#9A6B00' },
  boxRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  boxLabel: { width: 58, fontSize: 13, color: Brand.ink },
  barTrack: {
    flex: 1,
    height: 12,
    backgroundColor: Brand.soft,
    borderRadius: 999,
    overflow: 'hidden',
  },
  barFill: { height: '100%', backgroundColor: Brand.primary, borderRadius: 999 },
  boxCount: { width: 28, fontSize: 13, fontWeight: '700', color: Brand.ink, textAlign: 'center' },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  weekCol: { alignItems: 'center', gap: 4, flex: 1 },
  weekValue: { fontSize: 11, color: Brand.secondary, height: 14 },
  weekBar: { width: 24, backgroundColor: Brand.chip, borderRadius: 8 },
  weekDay: { fontSize: 11, color: Brand.secondary },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: Brand.ink, marginBottom: 10, marginTop: 4 },
  achGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  achCard: {
    width: '31%',
    backgroundColor: Brand.soft,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Brand.chip,
  },
  achLocked: { backgroundColor: '#FAFAFC', borderColor: Brand.border },
  achEmoji: { fontSize: 26 },
  achTitle: { fontSize: 12, fontWeight: '700', color: Brand.ink, marginTop: 6, textAlign: 'center' },
  achState: { fontSize: 10, color: Brand.secondary, marginTop: 2 },
});
