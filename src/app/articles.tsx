// تمرین آرتیکل: یک اسم نشان داده می‌شود، کاربر der / die / das را انتخاب می‌کند
// (آبی/قرمز/سبز)، بازخورد فوری می‌گیرد و می‌تواند کلمه‌ی اشتباه را به لایتنر بفرستد.
// داده از دیکشنری محلی (اسم‌های A1 تا B1 با آرتیکل).
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ScreenScroll } from '@/components/screen';
import { SpeakButtons } from '@/components/speak-button';
import { BackRow, Segment, useTrainingStyles } from '@/components/training-ui';
import { articleNouns, type CefrLevel, type LocalEntry } from '@/lib/local-dict';
import { logActivity } from '@/lib/storage';
import { useAppTheme } from '@/lib/theme-context';
import { addLocalWordToLeitner, ARTICLE_COLORS, faNum, shuffle } from '@/lib/training';

type Article = 'der' | 'die' | 'das';
type LevelFilter = 'all' | CefrLevel;
const ROUND = 20;
const ARTICLES: Article[] = ['der', 'die', 'das'];

const LEVEL_OPTIONS: { value: LevelFilter; label: string }[] = [
  { value: 'all', label: 'همه' },
  { value: 'A1', label: 'A1' },
  { value: 'A2', label: 'A2' },
  { value: 'B1', label: 'B1' },
];

type AddState = 'idle' | 'adding' | 'added' | 'failed';

export default function ArticlesScreen() {
  const { isDark } = useAppTheme();
  const t = useTrainingStyles();
  const [level, setLevel] = useState<LevelFilter>('all');
  const makeRound = useCallback(
    (lv: LevelFilter) => shuffle(articleNouns(lv === 'all' ? null : lv)).slice(0, ROUND),
    [],
  );
  // دور اول بعد از mount ساخته می‌شود (نه در رندر) تا HTML ایستای وب با کلاینت یکی بماند
  const [round, setRound] = useState<LocalEntry[] | null>(null);
  useEffect(() => {
    setRound(makeRound('all'));
  }, [makeRound]);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<Article | null>(null);
  const [correct, setCorrect] = useState(0);
  const [missed, setMissed] = useState<LocalEntry[]>([]);
  const [addState, setAddState] = useState<Record<string, AddState>>({});

  const restart = (lv: LevelFilter = level) => {
    setRound(makeRound(lv));
    setIndex(0);
    setPicked(null);
    setCorrect(0);
    setMissed([]);
  };

  const changeLevel = (lv: LevelFilter) => {
    setLevel(lv);
    restart(lv);
  };

  const noun = round?.[index];
  const finished = !!round && index >= round.length;

  const choose = (a: Article) => {
    if (!noun || picked) return;
    setPicked(a);
    if (a === noun.article) setCorrect((c) => c + 1);
    else setMissed((m) => [...m, noun]);
    logActivity('review').catch(() => {});
  };

  const next = () => {
    setPicked(null);
    setIndex((i) => i + 1);
  };

  const addToLeitner = async (n: LocalEntry) => {
    if (addState[n.word] === 'adding' || addState[n.word] === 'added') return;
    setAddState((s) => ({ ...s, [n.word]: 'adding' }));
    try {
      await addLocalWordToLeitner(n);
      await logActivity('add');
      setAddState((s) => ({ ...s, [n.word]: 'added' }));
    } catch {
      setAddState((s) => ({ ...s, [n.word]: 'failed' }));
    }
  };

  const color = (a: Article) => ARTICLE_COLORS[a][isDark ? 'dark' : 'light'];
  const styles = useMemo(() => localStyles(), []);

  const addLabel = (n: LocalEntry) => {
    const st = addState[n.word] ?? 'idle';
    return st === 'adding'
      ? '⏳ در حال افزودن…'
      : st === 'added'
        ? '✅ به لایتنر اضافه شد'
        : st === 'failed'
          ? '⚠️ نشد — دوباره بزن'
          : '➕ افزودن به لایتنر';
  };

  return (
    <ScreenScroll>
      <BackRow />
      <Text style={t.title}>🎨 آرتیکل der/die/das</Text>
      <Text style={t.subtitle}>آرتیکل درست را بزن. آبی = der، قرمز = die، سبز = das.</Text>

      <Segment options={LEVEL_OPTIONS} value={level} onChange={changeLevel} />

      {!round ? null : round.length === 0 ? (
        <View style={t.centerBox}>
          <Text style={t.centerText}>برای این سطح اسمی پیدا نشد.</Text>
        </View>
      ) : finished ? (
        <View style={t.centerBox}>
          <Text style={t.bigEmoji}>🏁</Text>
          <Text style={t.centerTitle}>
            امتیاز: {faNum(correct)} از {faNum(round.length)}
          </Text>
          <Text style={t.centerText}>
            {missed.length ? 'این‌ها را اشتباه زدی — بفرستشان به لایتنر:' : 'همه را درست زدی! 🎉'}
          </Text>
          {missed.map((n) => (
            <View key={n.word} style={[t.outlineCard, styles.missRow]}>
              <View style={{ flexShrink: 1 }}>
                <Text style={[styles.missWord, { color: color(n.article as Article) }]}>
                  {n.article} {n.word}
                </Text>
                <Text style={t.meta}>{n.fa}</Text>
              </View>
              <Pressable onPress={() => addToLeitner(n)} style={styles.smallBtnWrap}>
                <Text style={t.chip}>{addLabel(n)}</Text>
              </Pressable>
            </View>
          ))}
          <Pressable onPress={() => restart()} style={[t.primaryBtn, { alignSelf: 'stretch' }]}>
            <Text style={t.primaryBtnText}>🔄 دور تازه</Text>
          </Pressable>
        </View>
      ) : noun ? (
        <>
          <View style={t.scoreRow}>
            <Text style={t.progress}>
              کارت {faNum(index + 1)} از {faNum(round.length)}
            </Text>
            <Text style={t.progress}>
              ✅ {faNum(correct)} — ❌ {faNum(missed.length)}
            </Text>
          </View>

          <View style={[t.card, { alignItems: 'center' }]}>
            {noun.cefr ? <Text style={[t.chip, { marginBottom: 10 }]}>{noun.cefr}</Text> : null}
            <Text style={t.word} selectable>
              {picked ? (
                <Text style={{ color: color(noun.article as Article) }}>{noun.article} </Text>
              ) : (
                <Text style={styles.blank}>___ </Text>
              )}
              {noun.word}
            </Text>
            <Text style={t.persian}>{noun.fa}</Text>
            {picked && noun.plural ? (
              <Text style={[t.meta, t.ltr]}>جمع: die {noun.plural}</Text>
            ) : null}
            {picked ? (
              <View style={{ marginTop: 12 }}>
                <SpeakButtons text={`${noun.article} ${noun.word}`} />
              </View>
            ) : null}
          </View>

          <View style={styles.choiceRow}>
            {ARTICLES.map((a) => {
              const isRight = picked && a === noun.article;
              const isWrongPick = picked === a && a !== noun.article;
              const faded = picked && !isRight && !isWrongPick;
              return (
                <Pressable
                  key={a}
                  onPress={() => choose(a)}
                  disabled={!!picked}
                  style={[
                    styles.choice,
                    { backgroundColor: color(a) },
                    faded ? { opacity: 0.35 } : null,
                    isRight ? styles.choiceRight : null,
                  ]}>
                  <Text style={styles.choiceText}>
                    {isRight ? '✓ ' : isWrongPick ? '✗ ' : ''}
                    {a}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {picked ? (
            <>
              <View style={picked === noun.article ? t.feedbackGood : t.feedbackBad}>
                <Text style={t.feedbackText}>
                  {picked === noun.article ? '✅ آفرین! درست بود.' : '❌ نه — درستش این است: '}
                  {picked !== noun.article ? (
                    <Text style={{ color: color(noun.article as Article), fontWeight: '800' }}>
                      {noun.article} {noun.word}
                    </Text>
                  ) : null}
                </Text>
              </View>
              {picked !== noun.article ? (
                <Pressable onPress={() => addToLeitner(noun)} style={t.secondaryBtn}>
                  <Text style={t.secondaryBtnText}>{addLabel(noun)}</Text>
                </Pressable>
              ) : null}
              <Pressable onPress={next} style={t.primaryBtn}>
                <Text style={t.primaryBtnText}>بعدی ←</Text>
              </Pressable>
            </>
          ) : null}
        </>
      ) : null}
    </ScreenScroll>
  );
}

function localStyles() {
  return StyleSheet.create({
    blank: { opacity: 0.35 },
    choiceRow: { flexDirection: 'row', gap: 10, marginTop: 16, direction: 'ltr' },
    choice: { flex: 1, borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
    choiceRight: { borderWidth: 3, borderColor: '#ffffff99' },
    choiceText: { color: '#fff', fontSize: 18, fontWeight: '800', writingDirection: 'ltr' },
    missRow: {
      alignSelf: 'stretch',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
      paddingVertical: 12,
      marginTop: 6,
    },
    missWord: { fontSize: 17, fontWeight: '800', writingDirection: 'ltr', textAlign: 'left' },
    smallBtnWrap: { flexShrink: 0 },
  });
}
