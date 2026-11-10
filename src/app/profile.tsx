// صفحه‌ی پروفایل: سربرگ 33Bayan، هدف روزانه، فهرست واژگان لایتنر (با حذف)
// و معرفی/پیوند ربات بله
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Brand } from '@/constants/theme';
import { leitnerList, leitnerRemove, type LeitnerCard } from '@/lib/api';
import { getGoal, setGoal } from '@/lib/storage';

const faNum = (n: number) => n.toLocaleString('fa-IR');
const GOALS = [5, 10, 20] as const;

export default function ProfileScreen() {
  const [cards, setCards] = useState<LeitnerCard[]>([]);
  const [goal, setGoalState] = useState<number>(10);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        const [list, g] = await Promise.all([
          leitnerList().catch(() => ({ ok: false, cards: [] as LeitnerCard[] })),
          getGoal().catch(() => 10),
        ]);
        if (!active) return;
        setCards(list.cards || []);
        setGoalState(g);
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
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
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

      {/* درباره */}
      <View style={[styles.card, { marginTop: 18 }]}>
        <Text style={styles.cardTitle}>درباره‌ی 33Bayan</Text>
        <Text style={styles.aboutText}>
          مغز این اپ همان ربات بله‌ی 33Bayan است؛ کلماتت روی سرور ذخیره می‌شوند و از هر دستگاهی در
          دسترس‌اند. معنی‌ها از ویکی‌واژه و DWDS می‌آیند و قبل از نمایش، با هوش مصنوعی بازبینی
          می‌شوند.
        </Text>
        <Pressable
          onPress={() => Linking.openURL('https://ble.ir/32bayanbot')}
          style={styles.botBtn}>
          <Text style={styles.botBtnText}>🤖 ربات بله</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 26, fontWeight: '800', color: Brand.ink, marginBottom: 16 },
  headerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: Brand.soft,
    borderRadius: Brand.radius,
    padding: 16,
    marginBottom: 14,
  },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: Brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: 22, fontWeight: '800' },
  headerInfo: { flex: 1 },
  appName: { fontSize: 20, fontWeight: '800', color: Brand.ink, writingDirection: 'ltr', textAlign: 'left' },
  appSub: { fontSize: 13, color: Brand.secondary, marginTop: 3 },
  card: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: Brand.border,
    borderRadius: Brand.radius,
    padding: 16,
    marginBottom: 14,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: Brand.ink, marginBottom: 10 },
  cardSub: { fontSize: 13, color: Brand.secondary, marginTop: 10 },
  goalRow: { flexDirection: 'row', gap: 8 },
  goalChip: {
    backgroundColor: Brand.chip,
    color: Brand.primaryDeep,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    fontSize: 14,
    fontWeight: '700',
    overflow: 'hidden',
  },
  goalChipActive: { backgroundColor: Brand.primary, color: '#fff' },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: Brand.ink, marginBottom: 10, marginTop: 4 },
  emptyText: { fontSize: 14, color: Brand.secondary, lineHeight: 22 },
  wordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: Brand.border,
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    backgroundColor: '#fff',
  },
  wordInfo: { flex: 1 },
  word: { fontSize: 17, fontWeight: '700', color: Brand.ink, writingDirection: 'ltr', textAlign: 'left' },
  wordFa: { fontSize: 14, color: Brand.primaryDeep, marginTop: 2 },
  wordChips: { flexDirection: 'row', gap: 6, marginTop: 6 },
  miniChip: {
    backgroundColor: Brand.chip,
    color: Brand.primaryDeep,
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
  aboutText: { fontSize: 14, lineHeight: 23, color: '#3D3D5C' },
  botBtn: {
    backgroundColor: Brand.primary,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 14,
  },
  botBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
