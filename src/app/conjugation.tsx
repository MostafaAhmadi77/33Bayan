// صفحه‌ی صرف فعل — جدول‌های خبری/التزامی/امری/مصدرها برای یک فعل،
// با زبان بصری «شیشه تیره» (v1.5.0): کارت‌های شیشه‌ای و رنگ بنفش.
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { ScreenScroll } from '@/components/screen';
import { getConjugation, type Conjugation } from '@/lib/api';
import { commonPrefix, mainFormsLine } from '@/lib/conjugation-format';
import { useAppTheme } from '@/lib/theme-context';

type ThemeColors = ReturnType<typeof useAppTheme>['colors'];
type Styles = ReturnType<typeof makeStyles>;

const PRONOUNS = ['ich', 'du', 'er', 'wir', 'ihr', 'sie'];

const INDIKATIV: { key: keyof Conjugation['sections']['indikativ']; de: string; fa: string }[] = [
  { key: 'praesens', de: 'Präsens', fa: 'حال' },
  { key: 'praeteritum', de: 'Präteritum', fa: 'گذشته ساده' },
  { key: 'perfekt', de: 'Perfekt', fa: 'گذشته کامل' },
  { key: 'plusquamperfekt', de: 'Plusquamperfekt', fa: 'گذشته کامل‌تر' },
  { key: 'futur1', de: 'Futur I', fa: 'آینده ۱' },
  { key: 'futur2', de: 'Futur II', fa: 'آینده ۲' },
];

const KONJUNKTIV: { key: keyof Conjugation['sections']['konjunktiv']; de: string; fa: string }[] = [
  { key: 'konjunktiv1', de: 'Konjunktiv I', fa: 'التزامی ۱' },
  { key: 'konjunktiv2', de: 'Konjunktiv II', fa: 'التزامی ۲' },
  { key: 'praeteritumWuerde', de: 'Präteritum (würde)', fa: 'گذشته (würde)' },
  { key: 'plusquamperfektWuerde', de: 'Plusquamperfekt (würde)', fa: 'گذشته کامل (würde)' },
];

const INFINITIVE_ROWS: { key: keyof Conjugation['sections']['infinitive']; de: string; fa: string }[] = [
  { key: 'infinitiv1', de: 'Infinitiv I', fa: 'مصدر ۱' },
  { key: 'infinitiv2', de: 'Infinitiv II', fa: 'مصدر ۲' },
  { key: 'partizip1', de: 'Partizip I', fa: 'وجه وصفی ۱' },
  { key: 'partizip2', de: 'Partizip II', fa: 'وجه وصفی ۲' },
];

const param = (v: string | string[] | undefined): string =>
  typeof v === 'string' ? v : Array.isArray(v) ? v[0] ?? '' : '';

/** یک فرم با ریشه‌ی رنگی: پیشوند مشترک زمان، اگر دست‌کم ۲ حرف باشد. */
function FormText({ form, stem, styles }: { form: string; stem: string; styles: Styles }) {
  if (!stem || !form.startsWith(stem)) {
    return <Text style={styles.form}>{form}</Text>;
  }
  return (
    <Text style={styles.form}>
      <Text style={styles.stem}>{stem}</Text>
      {form.slice(stem.length)}
    </Text>
  );
}

function TenseCard({
  de,
  fa,
  forms,
  styles,
}: {
  de: string;
  fa: string;
  forms: string[];
  styles: Styles;
}) {
  const stem = useMemo(() => commonPrefix(forms), [forms]);
  return (
    <View style={styles.card}>
      <Text style={styles.tenseTitle}>
        {de} <Text style={styles.tenseSub}>· {fa}</Text>
      </Text>
      {forms.map((form, i) => (
        <View key={i} style={styles.row}>
          <Text style={styles.pronoun}>{PRONOUNS[i] ?? ''}</Text>
          <FormText form={form} stem={stem} styles={styles} />
        </View>
      ))}
    </View>
  );
}

export default function ConjugationScreen() {
  const { colors, isDark } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);
  const params = useLocalSearchParams();
  const word = param(params.word);
  const persian = param(params.persian);
  const ipa = param(params.ipa);

  const [data, setData] = useState<Conjugation | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!word) {
      setLoading(false);
      setFailed(true);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setFailed(false);
    setData(null);
    (async () => {
      const r = await getConjugation(word);
      if (cancelled) return;
      setLoading(false);
      if (r.ok && r.conjugation) setData(r.conjugation);
      else setFailed(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [word, attempt]);

  const mainForms = data ? mainFormsLine(data) : '';
  const indikativ = data
    ? INDIKATIV.filter((t) => data.sections.indikativ[t.key].length > 0)
    : [];
  const konjunktiv = data
    ? KONJUNKTIV.filter((t) => data.sections.konjunktiv[t.key].length > 0)
    : [];
  const infinitiveRows = data
    ? INFINITIVE_ROWS.filter((r) => data.sections.infinitive[r.key])
    : [];

  return (
    <ScreenScroll>
      <Pressable onPress={() => router.back()} style={styles.backRow}>
        <Text style={styles.backText}>› بازگشت</Text>
      </Pressable>

      <Text style={styles.verb} selectable>
        {word}
      </Text>
      {mainForms ? (
        <Text style={styles.mainForms} selectable>
          {mainForms}
        </Text>
      ) : null}
      {persian ? <Text style={styles.persian}>{persian}</Text> : null}
      {ipa ? <Text style={styles.ipa}>/{ipa}/</Text> : null}
      {data ? (
        <View style={styles.chips}>
          {data.aux ? <Text style={styles.chip}>فعل کمکی: {data.aux}</Text> : null}
          <Text style={styles.chip}>{data.irregular ? 'بی‌قاعده' : 'باقاعده'}</Text>
        </View>
      ) : null}

      {loading ? (
        <View style={styles.stateRow}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.stateText}>⏳ در حال آوردن صرف فعل…</Text>
        </View>
      ) : null}
      {!loading && failed ? (
        <Pressable onPress={() => setAttempt((a) => a + 1)} style={styles.stateRow}>
          <Text style={styles.stateText}>⚠️ صرف فعل نرسید — برای تلاش دوباره بزن</Text>
        </Pressable>
      ) : null}

      {data && !loading && !failed ? (
        <>
          {indikativ.length ? (
            <>
              <Text style={styles.sectionHeader}>خبری · Indikativ</Text>
              {indikativ.map((t) => (
                <TenseCard
                  key={t.key}
                  de={t.de}
                  fa={t.fa}
                  forms={data.sections.indikativ[t.key]}
                  styles={styles}
                />
              ))}
            </>
          ) : null}

          {konjunktiv.length ? (
            <>
              <Text style={styles.sectionHeader}>التزامی · Konjunktiv</Text>
              {konjunktiv.map((t) => (
                <TenseCard
                  key={t.key}
                  de={t.de}
                  fa={t.fa}
                  forms={data.sections.konjunktiv[t.key]}
                  styles={styles}
                />
              ))}
            </>
          ) : null}

          {data.sections.imperativ.length ? (
            <>
              <Text style={styles.sectionHeader}>امری · Imperativ</Text>
              <View style={styles.card}>
                <Text style={styles.tenseTitle}>
                  Imperativ <Text style={styles.tenseSub}>· امری</Text>
                </Text>
                {data.sections.imperativ.map((form, i) => (
                  <View key={i} style={styles.row}>
                    <Text style={styles.pronoun}>—</Text>
                    <Text style={styles.form}>{form}</Text>
                  </View>
                ))}
              </View>
            </>
          ) : null}

          {infinitiveRows.length ? (
            <>
              <Text style={styles.sectionHeader}>مصدرها · Infinitive / Partizip</Text>
              <View style={styles.card}>
                {infinitiveRows.map((r) => (
                  <View key={r.key} style={styles.infRow}>
                    <Text style={styles.infLabel}>
                      {r.de} · {r.fa}
                    </Text>
                    <Text style={styles.infValue}>{data.sections.infinitive[r.key]}</Text>
                  </View>
                ))}
              </View>
            </>
          ) : null}

          {!indikativ.length &&
          !konjunktiv.length &&
          !data.sections.imperativ.length &&
          !infinitiveRows.length ? (
            <Text style={styles.stateText}>برای این فعل صرفی پیدا نشد.</Text>
          ) : null}
        </>
      ) : null}
    </ScreenScroll>
  );
}

function makeStyles(colors: ThemeColors, isDark: boolean) {
  const glassBase: ViewStyle = {
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: colors.radius,
    padding: 16,
    ...(isDark
      ? {}
      : {
          shadowColor: '#1E1B4B',
          shadowOpacity: 0.08,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 6 },
          elevation: 3,
        }),
  };

  return StyleSheet.create({
    backRow: { alignSelf: 'flex-start', paddingVertical: 4, marginBottom: 8 },
    backText: { fontSize: 15, fontWeight: '700', color: colors.primaryDeep },
    verb: { fontSize: 36, fontWeight: '900', color: colors.ink, writingDirection: 'ltr', textAlign: 'left' },
    mainForms: { fontSize: 16, color: colors.secondary, writingDirection: 'ltr', textAlign: 'left', marginTop: 4 },
    persian: { fontSize: 24, fontWeight: '800', color: colors.ink, marginTop: 10 },
    ipa: { fontSize: 14, color: colors.secondary, writingDirection: 'ltr', textAlign: 'left', marginTop: 4 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
    chip: {
      backgroundColor: colors.chipTint,
      color: colors.chipTintText,
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: 999,
      fontSize: 13,
      overflow: 'hidden',
    },
    stateRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, marginTop: 8 },
    stateText: { fontSize: 14, color: colors.secondary },
    sectionHeader: { fontSize: 18, fontWeight: '800', color: colors.primaryDeep, marginTop: 22, marginBottom: 10 },
    card: { ...glassBase, marginTop: 10 },
    tenseTitle: { fontSize: 16, fontWeight: '800', color: colors.ink, writingDirection: 'ltr', textAlign: 'left', marginBottom: 8 },
    tenseSub: { fontSize: 13, fontWeight: '600', color: colors.secondary },
    row: { flexDirection: 'row', alignItems: 'baseline', gap: 14, paddingVertical: 5, direction: 'ltr' },
    pronoun: { width: 34, fontSize: 14, color: colors.secondary, fontStyle: 'italic', writingDirection: 'ltr' },
    form: { fontSize: 16, color: colors.ink, writingDirection: 'ltr' },
    stem: { color: colors.primaryDeep, fontWeight: '800' },
    infRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      gap: 12,
      paddingVertical: 6,
    },
    infLabel: { fontSize: 13, color: colors.secondary, flexShrink: 1 },
    infValue: { fontSize: 16, color: colors.ink, writingDirection: 'ltr' },
  });
}
