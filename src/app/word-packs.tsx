// بسته‌های واژگان Goethe (A1 تا B1): تعداد کلمه‌های هر سطح و درصدی که در جعبه‌ی
// لایتنر است. داده‌ی سطح‌ها از برچسب CEFR دیکشنری محلی می‌آید.
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { ScreenScroll } from '@/components/screen';
import { BackRow, useTrainingStyles } from '@/components/training-ui';
import { CEFR_LEVELS, wordsOfLevel, type CefrLevel } from '@/lib/local-dict';
import { useAppTheme } from '@/lib/theme-context';
import { faNum, leitnerWordSet } from '@/lib/training';

const LEVEL_FA: Record<CefrLevel, string> = {
  A1: 'مقدماتی',
  A2: 'پایه',
  B1: 'میانی',
};

export default function WordPacksScreen() {
  const { colors } = useAppTheme();
  const t = useTrainingStyles();
  const [inBox, setInBox] = useState<Set<string> | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  // هر بار برگشتن به این صفحه (مثلاً بعد از افزودن یک بسته) درصدها تازه می‌شوند
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      setLoading(true);
      setFailed(false);
      leitnerWordSet()
        .then((s) => alive && setInBox(s))
        .catch(() => alive && setFailed(true))
        .finally(() => alive && setLoading(false));
      return () => {
        alive = false;
      };
    }, []),
  );

  return (
    <ScreenScroll>
      <BackRow />
      <Text style={t.title}>📦 بسته‌های Goethe</Text>
      <Text style={t.subtitle}>
        واژه‌های فهرست Goethe برای هر سطح. یک بسته را باز کن و با یک دکمه همه‌ی کلمه‌های
        باقی‌مانده‌اش را به لایتنر اضافه کن.
      </Text>

      {failed ? (
        <Text style={[t.note, { marginBottom: 8 }]}>
          ⚠️ جعبه‌ی لایتنر بارگذاری نشد؛ درصد پیشرفت نشان داده نمی‌شود.
        </Text>
      ) : null}

      {CEFR_LEVELS.map((level) => {
        const words = wordsOfLevel(level);
        const have = inBox ? words.filter((w) => inBox.has(w.word.toLowerCase())).length : 0;
        const pct = words.length ? Math.round((have / words.length) * 100) : 0;
        return (
          <Pressable
            key={level}
            onPress={() => router.push({ pathname: '/word-pack', params: { level } })}
            style={[t.card, { marginBottom: 12 }]}>
            <View style={t.scoreRow}>
              <Text style={{ fontSize: 20, fontWeight: '800', color: colors.ink }}>
                {level} <Text style={{ fontSize: 14, color: colors.secondary }}>· {LEVEL_FA[level]}</Text>
              </Text>
              <Text style={t.chip}>{faNum(words.length)} کلمه</Text>
            </View>
            <View style={t.barTrack}>
              <View style={[t.barFill, { width: `${pct}%` }]} />
            </View>
            <View style={[t.scoreRow, { marginTop: 8, marginBottom: 0 }]}>
              {loading ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Text style={t.progress}>
                  {inBox ? `${faNum(have)} کلمه در لایتنر · ${faNum(pct)}٪` : '—'}
                </Text>
              )}
              <Text style={{ fontSize: 14, fontWeight: '700', color: colors.primaryDeep }}>
                باز کردن ←
              </Text>
            </View>
          </Pressable>
        );
      })}

      <Text style={t.note}>
        منبع سطح‌بندی: فهرست‌های واژگان Goethe-Institut / DWDS (A1 تا B1). کلمه‌های افزوده از
        خانه‌ی ۱ لایتنر شروع می‌شوند و اولین مرورشان فردا است.
      </Text>
    </ScreenScroll>
  );
}
