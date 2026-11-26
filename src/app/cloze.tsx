// تمرین «جمله‌ی جای خالی»: جمله‌ی واقعی آلمانی از Tatoeba با یک کلمه‌ی خالی،
// ترجمه‌ی فارسی به‌عنوان راهنما؛ کاربر کلمه را تایپ می‌کند.
// مقایسه ملایم است: حروف بزرگ/کوچک مهم نیست و ae/oe/ue/ss به‌جای ä/ö/ü/ß قبول است.
// داده: assets/data/cloze-sentences.json — جمله‌های Tatoeba برای واژه‌های A1 تا B1.
import { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import clozeData from '../../assets/data/cloze-sentences.json';

import { ScreenScroll } from '@/components/screen';
import { SpeakButtons } from '@/components/speak-button';
import { BackRow, Segment, useTrainingStyles } from '@/components/training-ui';
import { lookupLocal, type CefrLevel } from '@/lib/local-dict';
import { logActivity } from '@/lib/storage';
import { useAppTheme } from '@/lib/theme-context';
import { answerMatches, faNum, normalizeGerman, shuffle } from '@/lib/training';

/** w = شکل پایه، a = شکلِ داخل جمله (جواب)، c = سطح */
type ClozeItem = { w: string; a: string; c: CefrLevel; de: string; fa: string };
const ITEMS = clozeData as ClozeItem[];
const ROUND = 10;

type LevelFilter = 'all' | CefrLevel;
const LEVEL_OPTIONS: { value: LevelFilter; label: string }[] = [
  { value: 'all', label: 'همه' },
  { value: 'A1', label: 'A1' },
  { value: 'A2', label: 'A2' },
  { value: 'B1', label: 'B1' },
];

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** جمله را دور اولین رخداد کامل جواب سه تکه می‌کند */
function splitSentence(item: ClozeItem): [string, string, string] {
  const re = new RegExp(`(^|[^\\p{L}])(${escapeRe(item.a)})(?=[^\\p{L}]|$)`, 'u');
  const m = re.exec(item.de);
  if (!m) return [item.de, '', ''];
  const start = m.index + m[1].length;
  return [item.de.slice(0, start), item.de.slice(start, start + item.a.length), item.de.slice(start + item.a.length)];
}

type Verdict = 'right' | 'base' | 'wrong';

export default function ClozeScreen() {
  const { colors } = useAppTheme();
  const t = useTrainingStyles();
  const [level, setLevel] = useState<LevelFilter>('all');
  const [round, setRound] = useState<ClozeItem[] | null>(null);
  const [index, setIndex] = useState(0);
  const [input, setInput] = useState('');
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [hint, setHint] = useState(false);
  const [score, setScore] = useState(0);

  const restart = useCallback((lv: LevelFilter) => {
    const pool = lv === 'all' ? ITEMS : ITEMS.filter((i) => i.c === lv);
    setRound(shuffle(pool).slice(0, ROUND));
    setIndex(0);
    setInput('');
    setVerdict(null);
    setHint(false);
    setScore(0);
  }, []);

  useEffect(() => {
    restart('all');
  }, [restart]);

  const item = round?.[index];
  const finished = !!round && index >= round.length;

  const check = () => {
    if (!item || verdict || !input.trim()) return;
    let v: Verdict = 'wrong';
    if (answerMatches(input, item.a)) v = 'right';
    else if (normalizeGerman(input) === normalizeGerman(item.w)) v = 'base';
    setVerdict(v);
    if (v === 'right') setScore((s) => s + 1);
    logActivity('review').catch(() => {});
  };

  const reveal = () => {
    if (!item || verdict) return;
    setVerdict('wrong');
    logActivity('review').catch(() => {});
  };

  const next = () => {
    setIndex((i) => i + 1);
    setInput('');
    setVerdict(null);
    setHint(false);
  };

  const parts = item ? splitSentence(item) : ['', '', ''];
  const baseFa = item ? lookupLocal(item.w)?.fa ?? '' : '';

  return (
    <ScreenScroll keyboardShouldPersistTaps="handled">
      <BackRow />
      <Text style={t.title}>✍️ جمله‌ی جای خالی</Text>
      <Text style={t.subtitle}>کلمه‌ی گم‌شده را بنویس. ترجمه‌ی فارسی راهنمای توست.</Text>

      <Segment
        options={LEVEL_OPTIONS}
        value={level}
        onChange={(lv) => {
          setLevel(lv);
          restart(lv);
        }}
      />

      {!round ? null : round.length === 0 ? (
        <View style={t.centerBox}>
          <Text style={t.centerText}>برای این سطح جمله‌ای پیدا نشد.</Text>
        </View>
      ) : finished ? (
        <View style={t.centerBox}>
          <Text style={t.bigEmoji}>🏁</Text>
          <Text style={t.centerTitle}>
            امتیاز: {faNum(score)} از {faNum(round.length)}
          </Text>
          <Pressable onPress={() => restart(level)} style={[t.primaryBtn, { alignSelf: 'stretch' }]}>
            <Text style={t.primaryBtnText}>🔄 ۱۰ جمله‌ی تازه</Text>
          </Pressable>
        </View>
      ) : item ? (
        <>
          <View style={t.scoreRow}>
            <Text style={t.progress}>
              جمله‌ی {faNum(index + 1)} از {faNum(round.length)}
            </Text>
            <Text style={t.progress}>
              ✅ {faNum(score)} · {item.c}
            </Text>
          </View>

          <View style={t.card}>
            <Text style={{ fontSize: 20, lineHeight: 32, color: colors.ink, writingDirection: 'ltr', textAlign: 'left' }}>
              {parts[0]}
              {verdict ? (
                <Text style={{ color: verdict === 'right' ? colors.success : colors.danger, fontWeight: '800' }}>
                  {parts[1]}
                </Text>
              ) : (
                <Text style={{ color: colors.primaryDeep, fontWeight: '800' }}>
                  {' '}
                  {'_'.repeat(Math.max(4, Math.min(10, item.a.length)))}{' '}
                </Text>
              )}
              {parts[2]}
            </Text>
            <Text style={{ fontSize: 15.5, lineHeight: 26, color: colors.secondary, marginTop: 12 }}>
              🇮🇷 {item.fa}
            </Text>
            {hint && !verdict ? (
              <Text style={[t.meta, { marginTop: 10, lineHeight: 23 }]}>
                💡 با «{item.a.charAt(0)}» شروع می‌شود و {faNum(item.a.length)} حرف دارد.
                {item.w.toLowerCase() !== item.a.toLowerCase()
                  ? `\nشکل پایه: ${item.w}${baseFa ? ` (${baseFa})` : ''}`
                  : baseFa
                    ? `\nمعنی: ${baseFa}`
                    : ''}
              </Text>
            ) : null}
            {verdict ? (
              <View style={{ marginTop: 12 }}>
                <SpeakButtons text={item.de} />
              </View>
            ) : null}
          </View>

          {!verdict ? (
            <>
              <TextInput
                style={[t.input, { marginTop: 14 }]}
                value={input}
                onChangeText={setInput}
                onSubmitEditing={check}
                placeholder="کلمه‌ی گم‌شده…"
                placeholderTextColor={colors.secondary}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
              />
              <Pressable
                onPress={check}
                disabled={!input.trim()}
                style={[t.primaryBtn, !input.trim() && t.disabled]}>
                <Text style={t.primaryBtnText}>✔️ بررسی</Text>
              </Pressable>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Pressable onPress={() => setHint(true)} style={[t.secondaryBtn, { flex: 1 }]}>
                  <Text style={t.secondaryBtnText}>💡 راهنما</Text>
                </Pressable>
                <Pressable onPress={reveal} style={[t.secondaryBtn, { flex: 1 }]}>
                  <Text style={t.secondaryBtnText}>👀 نشان بده</Text>
                </Pressable>
              </View>
            </>
          ) : (
            <>
              <View style={verdict === 'right' ? t.feedbackGood : t.feedbackBad}>
                <Text style={t.feedbackText}>
                  {verdict === 'right'
                    ? '✅ درست!'
                    : verdict === 'base'
                      ? '🟡 کلمه درست است، ولی در این جمله شکلش فرق می‌کند: '
                      : input.trim()
                        ? '❌ نه — جواب: '
                        : 'جواب: '}
                  {verdict !== 'right' ? <Text style={[t.good, t.ltr]}>{item.a}</Text> : null}
                  {baseFa ? `\n${item.w} = ${baseFa}` : ''}
                </Text>
              </View>
              <Pressable onPress={next} style={t.primaryBtn}>
                <Text style={t.primaryBtnText}>بعدی ←</Text>
              </Pressable>
            </>
          )}
        </>
      ) : null}

      <Text style={[t.note, { marginTop: 24 }]}>جمله‌ها از Tatoeba (CC BY 2.0 FR).</Text>
    </ScreenScroll>
  );
}
