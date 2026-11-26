// اجزای مشترک صفحه‌های بخش «تمرین‌ها» — همان زبان بصری صفحه‌ی تمرین:
// کارت‌های نرم بنفش، دکمه‌ی اصلی بنفش، سوییچ قرصی، چیپ‌ها.
import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAppTheme, type AppTheme } from '@/lib/theme-context';

export function BackRow({ label = 'تمرین‌ها' }: { label?: string }) {
  const { colors } = useAppTheme();
  return (
    <Pressable
      onPress={() => (router.canGoBack() ? router.back() : router.replace('/practice'))}
      style={{ alignSelf: 'flex-start', paddingVertical: 4, marginBottom: 8 }}>
      <Text style={{ fontSize: 15, fontWeight: '700', color: colors.primaryDeep }}>› {label}</Text>
    </Pressable>
  );
}

/** سوییچ قرصی چندگزینه‌ای (مثل سوییچ حالت صفحه‌ی تمرین) */
export function Segment<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const styles = useTrainingStyles();
  return (
    <View style={styles.segment}>
      {options.map((o) => (
        <Pressable
          key={o.value}
          onPress={() => onChange(o.value)}
          style={[styles.segmentBtn, value === o.value && styles.segmentBtnActive]}>
          <Text style={[styles.segmentText, value === o.value && styles.segmentTextActive]}>
            {o.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

export function useTrainingStyles() {
  const { colors, isDark } = useAppTheme();
  return useMemo(() => makeTrainingStyles(colors, isDark), [colors, isDark]);
}

export function makeTrainingStyles(colors: AppTheme['colors'], isDark: boolean) {
  return StyleSheet.create({
    title: { fontSize: 26, fontWeight: '800', color: colors.ink, marginBottom: 6 },
    subtitle: { fontSize: 14, color: colors.secondary, marginBottom: 16, lineHeight: 22 },
    segment: {
      flexDirection: 'row',
      backgroundColor: colors.soft,
      borderRadius: 999,
      padding: 4,
      marginBottom: 18,
    },
    segmentBtn: { flex: 1, paddingVertical: 9, borderRadius: 999, alignItems: 'center' },
    segmentBtnActive: { backgroundColor: colors.primary },
    segmentText: { fontSize: 13.5, fontWeight: '700', color: colors.secondary },
    segmentTextActive: { color: '#fff' },
    progress: { fontSize: 13, color: colors.secondary, marginBottom: 10 },
    card: { backgroundColor: colors.soft, borderRadius: colors.radius, padding: 18 },
    outlineCard: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: colors.radius,
      padding: 18,
    },
    word: {
      fontSize: 30,
      fontWeight: '800',
      color: colors.ink,
      writingDirection: 'ltr',
      textAlign: 'center',
    },
    persian: { fontSize: 18, fontWeight: '700', color: colors.primaryDeep, textAlign: 'center', marginTop: 6 },
    meta: { fontSize: 14, color: colors.secondary, marginTop: 6 },
    ltr: { writingDirection: 'ltr', textAlign: 'left' },
    chip: {
      backgroundColor: colors.chip,
      color: colors.primaryDeep,
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: 999,
      fontSize: 13,
      overflow: 'hidden',
    },
    primaryBtn: {
      backgroundColor: colors.primary,
      borderRadius: 14,
      paddingVertical: 13,
      paddingHorizontal: 16,
      alignItems: 'center',
      marginTop: 16,
    },
    primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
    secondaryBtn: {
      backgroundColor: colors.chip,
      borderRadius: 14,
      paddingVertical: 12,
      paddingHorizontal: 16,
      alignItems: 'center',
      marginTop: 12,
    },
    secondaryBtnText: { color: colors.primaryDeep, fontSize: 14.5, fontWeight: '700' },
    disabled: { opacity: 0.55 },
    centerBox: { alignItems: 'center', paddingVertical: 30, gap: 8 },
    bigEmoji: { fontSize: 44 },
    centerTitle: { fontSize: 19, fontWeight: '800', color: colors.ink, textAlign: 'center' },
    centerText: { fontSize: 15, color: colors.secondary, textAlign: 'center', lineHeight: 24 },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 11,
      fontSize: 17,
      color: colors.ink,
      backgroundColor: colors.card,
      writingDirection: 'ltr',
      textAlign: 'left',
    },
    good: { color: colors.success, fontWeight: '800' },
    bad: { color: colors.danger, fontWeight: '800' },
    feedbackGood: {
      backgroundColor: isDark ? 'rgba(52,199,123,0.16)' : '#E3F8EE',
      borderRadius: 14,
      padding: 12,
      marginTop: 14,
    },
    feedbackBad: {
      backgroundColor: isDark ? 'rgba(255,107,107,0.14)' : '#FFEDED',
      borderRadius: 14,
      padding: 12,
      marginTop: 14,
    },
    feedbackText: { fontSize: 15, color: colors.ink, lineHeight: 23 },
    scoreRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    sectionHeader: { fontSize: 17, fontWeight: '800', color: colors.ink, marginTop: 22, marginBottom: 10 },
    barTrack: { height: 8, borderRadius: 999, backgroundColor: colors.border, overflow: 'hidden' },
    barFill: { height: '100%', borderRadius: 999, backgroundColor: colors.primary },
    note: { fontSize: 12, color: colors.secondary, marginTop: 10, lineHeight: 19 },
  });
}
