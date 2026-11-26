// تمرین صرف فعل: یک فعل انتخاب کن، زمان (Präsens / Präteritum / Perfekt) را بزن
// و شش صیغه را خودت بنویس؛ بررسی با مقایسه‌ی ملایم (ä=ae، ß=ss، بی‌اعتنا به حروف بزرگ).
// جدول کامل صرف همان صفحه‌ی conjugation است.
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';

import { ScreenScroll } from '@/components/screen';
import { SpeakButtons } from '@/components/speak-button';
import { BackRow, Segment, useTrainingStyles } from '@/components/training-ui';
import { getConjugation, type Conjugation } from '@/lib/api';
import { lookupLocal, wordsOfLevel } from '@/lib/local-dict';
import { logActivity } from '@/lib/storage';
import { useAppTheme } from '@/lib/theme-context';
import { answerMatches, faNum, shuffle } from '@/lib/training';

type Tense = 'praesens' | 'praeteritum' | 'perfekt';
const TENSES: { value: Tense; label: string }[] = [
  { value: 'praesens', label: 'Präsens · حال' },
  { value: 'praeteritum', label: 'Präteritum' },
  { value: 'perfekt', label: 'Perfekt' },
];
const PRONOUNS = ['ich', 'du', 'er/sie/es', 'wir', 'ihr', 'sie/Sie'];

const param = (v: string | string[] | undefined) => (typeof v === 'string' ? v : Array.isArray(v) ? v[0] ?? '' : '');

/** فعل‌های پرکاربرد A1/A2 برای پیشنهاد سریع */
function commonVerbs(): string[] {
  const verbs = [...wordsOfLevel('A1'), ...wordsOfLevel('A2')].filter((w) => w.type === 'Verb');
  return verbs.map((v) => v.word);
}

export default function VerbDrillScreen() {
  const { colors } = useAppTheme();
  const t = useTrainingStyles();
  const params = useLocalSearchParams();
  const allVerbs = useMemo(() => commonVerbs(), []);
  const quick = allVerbs.slice(0, 12);

  const [query, setQuery] = useState(param(params.word));
  const [verb, setVerb] = useState(param(params.word));
  const [data, setData] = useState<Conjugation | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [tense, setTense] = useState<Tense>('praesens');
  const [answers, setAnswers] = useState<string[]>(['', '', '', '', '', '']);
  const [checked, setChecked] = useState(false);

  const persian = verb ? lookupLocal(verb)?.fa ?? '' : '';

  useEffect(() => {
    if (!verb) return;
    let alive = true;
    setLoading(true);
    setFailed(false);
    setData(null);
    getConjugation(verb).then((r) => {
      if (!alive) return;
      setLoading(false);
      if (r.ok && r.conjugation) setData(r.conjugation);
      else setFailed(true);
    });
    return () => {
      alive = false;
    };
  }, [verb, attempt]);

  // با عوض شدن فعل یا زمان، پاسخ‌ها پاک می‌شوند
  const clearAnswers = () => {
    setAnswers(['', '', '', '', '', '']);
    setChecked(false);
  };
  const changeTense = (v: Tense) => {
    setTense(v);
    clearAnswers();
  };

  const pick = (raw: string) => {
    const q = raw.trim();
    if (!q) return;
    // صورت صرف‌شده (ging) → مصدر (gehen)
    const local = lookupLocal(q);
    const base = local && local.type === 'Verb' ? local.word : q.toLowerCase();
    setQuery(base);
    setVerb(base);
    clearAnswers();
  };

  const forms = data ? data.sections.indikativ[tense] : [];
  const results = forms.map((f, i) => answerMatches(answers[i] ?? '', f));
  const score = results.filter(Boolean).length;

  const check = () => {
    if (!forms.length) return;
    setChecked(true);
    logActivity('review').catch(() => {});
  };

  return (
    <ScreenScroll keyboardShouldPersistTaps="handled">
      <BackRow />
      <Text style={t.title}>🔤 صرف فعل</Text>
      <Text style={t.subtitle}>یک فعل انتخاب کن؛ جدول کامل صرفش را ببین یا صیغه‌ها را خودت بنویس.</Text>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <TextInput
          style={[t.input, { flex: 1 }]}
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={() => pick(query)}
          placeholder="مثلاً gehen"
          placeholderTextColor={colors.secondary}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="go"
        />
        <Pressable onPress={() => pick(query)} style={[t.primaryBtn, { marginTop: 0, justifyContent: 'center' }]}>
          <Text style={t.primaryBtnText}>برو</Text>
        </Pressable>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12, direction: 'ltr' }}>
        {quick.map((v) => (
          <Pressable key={v} onPress={() => pick(v)}>
            <Text style={[t.chip, v === verb && { backgroundColor: colors.primary, color: '#fff' }]}>{v}</Text>
          </Pressable>
        ))}
        <Pressable onPress={() => pick(shuffle(allVerbs)[0] ?? 'gehen')}>
          <Text style={t.chip}>🎲 تصادفی</Text>
        </Pressable>
      </View>

      {!verb ? (
        <View style={t.centerBox}>
          <Text style={t.bigEmoji}>🔤</Text>
          <Text style={t.centerText}>یک فعل بنویس یا از پیشنهادها انتخاب کن.</Text>
        </View>
      ) : (
        <>
          <View style={[t.card, { marginTop: 18 }]}>
            <Text style={[t.word, t.ltr]}>{verb}</Text>
            {persian ? <Text style={[t.persian, { textAlign: 'left' }]}>{persian}</Text> : null}
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
              <SpeakButtons text={verb} />
              <Pressable
                onPress={() => router.push({ pathname: '/conjugation', params: { word: verb, persian } })}
                style={{ backgroundColor: colors.chip, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 }}>
                <Text style={{ color: colors.primaryDeep, fontSize: 13, fontWeight: '600' }}>📋 جدول کامل صرف</Text>
              </Pressable>
            </View>
          </View>

          {loading ? (
            <View style={t.centerBox}>
              <ActivityIndicator color={colors.primary} />
              <Text style={t.centerText}>⏳ در حال آوردن صرف فعل…</Text>
            </View>
          ) : failed ? (
            <Pressable onPress={() => setAttempt((a) => a + 1)} style={t.centerBox}>
              <Text style={t.centerText}>⚠️ صرف این فعل نرسید. املای مصدر را چک کن یا برای تلاش دوباره بزن.</Text>
            </Pressable>
          ) : data ? (
            <>
              <Text style={t.sectionHeader}>✍️ تمرین جای خالی</Text>
              <Segment options={TENSES} value={tense} onChange={changeTense} />
              {forms.length ? (
                <View style={t.outlineCard}>
                  {forms.map((form, i) => (
                    <View key={`${tense}-${i}`} style={{ marginBottom: 10 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, direction: 'ltr' }}>
                        <Text
                          style={{
                            width: 78,
                            fontSize: 14,
                            color: colors.secondary,
                            fontStyle: 'italic',
                            writingDirection: 'ltr',
                            textAlign: 'left',
                          }}>
                          {PRONOUNS[i]}
                        </Text>
                        <TextInput
                          style={[
                            t.input,
                            { flex: 1, fontSize: 16, paddingVertical: 8 },
                            checked && { borderColor: results[i] ? colors.success : colors.danger, borderWidth: 2 },
                          ]}
                          value={answers[i]}
                          onChangeText={(v) => {
                            setAnswers((a) => a.map((x, j) => (j === i ? v : x)));
                            setChecked(false);
                          }}
                          autoCapitalize="none"
                          autoCorrect={false}
                          placeholder="…"
                          placeholderTextColor={colors.secondary}
                        />
                      </View>
                      {checked && !results[i] ? (
                        <Text style={[t.meta, t.ltr, { marginStart: 88, marginTop: 4 }]}>
                          ✓ <Text style={t.good}>{form}</Text>
                        </Text>
                      ) : null}
                    </View>
                  ))}
                  {tense === 'perfekt' ? (
                    <Text style={t.note}>
                      در Perfekt فعل کمکی را هم بنویس (مثلاً: bin gegangen / habe gemacht).
                    </Text>
                  ) : null}
                </View>
              ) : (
                <Text style={t.centerText}>این زمان برای این فعل در دسترس نیست.</Text>
              )}

              {checked ? (
                <View style={score === forms.length ? t.feedbackGood : t.feedbackBad}>
                  <Text style={t.feedbackText}>
                    {score === forms.length
                      ? `🎉 عالی! همه‌ی ${faNum(forms.length)} صیغه درست بود.`
                      : `${faNum(score)} از ${faNum(forms.length)} درست. شکل درست زیر هر خانه آمده.`}
                  </Text>
                </View>
              ) : null}

              <Pressable
                onPress={check}
                disabled={!forms.length}
                style={[t.primaryBtn, !forms.length && t.disabled]}>
                <Text style={t.primaryBtnText}>✔️ بررسی</Text>
              </Pressable>
              {checked ? (
                <Pressable
                  onPress={() => {
                    setAnswers(['', '', '', '', '', '']);
                    setChecked(false);
                  }}
                  style={t.secondaryBtn}>
                  <Text style={t.secondaryBtnText}>🔄 دوباره</Text>
                </Pressable>
              ) : null}
            </>
          ) : null}
        </>
      )}
    </ScreenScroll>
  );
}
