// یک بسته‌ی واژگان Goethe: فهرست کلمه‌ها (با نشان «در لایتنر») و افزودن همه‌ی
// کلمه‌های باقی‌مانده به لایتنر با یک دکمه — دسته‌ای، با نوار پیشرفت و امکان توقف.
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { ScreenScroll } from '@/components/screen';
import { BackRow, Segment, useTrainingStyles } from '@/components/training-ui';
import { CEFR_LEVELS, wordsOfLevel, type CefrLevel } from '@/lib/local-dict';
import { logActivity } from '@/lib/storage';
import { useAppTheme } from '@/lib/theme-context';
import { ARTICLE_COLORS, bulkAddToLeitner, faNum, leitnerWordSet, type BulkProgress } from '@/lib/training';

const PAGE = 60;
type Filter = 'all' | 'todo' | 'done';

export default function WordPackScreen() {
  const { colors, isDark } = useAppTheme();
  const t = useTrainingStyles();
  const params = useLocalSearchParams<{ level?: string }>();
  const level: CefrLevel = (CEFR_LEVELS as string[]).includes(params.level ?? '')
    ? (params.level as CefrLevel)
    : 'A1';
  const words = useMemo(() => wordsOfLevel(level), [level]);

  const [inBox, setInBox] = useState<Set<string> | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [filter, setFilter] = useState<Filter>('all');
  const [shown, setShown] = useState(PAGE);

  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<BulkProgress | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const cancelRef = useRef(false);

  useEffect(() => {
    let alive = true;
    setLoadFailed(false);
    setInBox(null);
    leitnerWordSet()
      .then((s) => alive && setInBox(s))
      .catch(() => alive && setLoadFailed(true));
    return () => {
      alive = false;
      cancelRef.current = true; // ترک صفحه = توقف افزودن
    };
  }, [attempt]);

  const remaining = useMemo(
    () => (inBox ? words.filter((w) => !inBox.has(w.word.toLowerCase())) : []),
    [words, inBox],
  );
  const have = inBox ? words.length - remaining.length : 0;
  const pct = words.length ? Math.round((have / words.length) * 100) : 0;

  const visible = useMemo(() => {
    if (!inBox || filter === 'all') return words;
    return words.filter((w) => inBox.has(w.word.toLowerCase()) === (filter === 'done'));
  }, [words, inBox, filter]);

  const addAll = async () => {
    if (running || !inBox || !remaining.length) return;
    cancelRef.current = false;
    setRunning(true);
    setResult(null);
    setProgress({ done: 0, failed: 0, total: remaining.length });
    const r = await bulkAddToLeitner(remaining, setProgress, () => cancelRef.current);
    // افزوده‌ها همان لحظه در مجموعه‌ی «در لایتنر» ثبت می‌شوند
    setInBox((prev) => {
      const next = new Set(prev ?? []);
      for (const w of r.added) next.add(w.toLowerCase());
      return next;
    });
    await logActivity('add', r.added.length).catch(() => {});
    setRunning(false);
    setResult(
      r.aborted && !cancelRef.current
        ? `⚠️ ${faNum(r.added.length)} کلمه اضافه شد، بعد اتصال قطع شد. دوباره بزن تا بقیه اضافه شوند.`
        : r.aborted
          ? `⏸️ متوقف شد — ${faNum(r.added.length)} کلمه اضافه شد.`
          : r.failed
            ? `✅ ${faNum(r.added.length)} کلمه اضافه شد؛ ${faNum(r.failed)} کلمه نشد (دوباره بزن).`
            : `🎉 ${faNum(r.added.length)} کلمه به لایتنر اضافه شد!`,
    );
  };

  const color = (a: string | null) =>
    a === 'der' || a === 'die' || a === 'das' ? ARTICLE_COLORS[a][isDark ? 'dark' : 'light'] : colors.secondary;

  return (
    <ScreenScroll>
      <BackRow label="بسته‌ها" />
      <Text style={t.title}>📦 بسته‌ی {level}</Text>
      <Text style={t.subtitle}>
        {faNum(words.length)} کلمه · {inBox ? `${faNum(have)} در لایتنر (${faNum(pct)}٪)` : '…'}
      </Text>

      <View style={t.barTrack}>
        <View style={[t.barFill, { width: `${pct}%` }]} />
      </View>

      {loadFailed ? (
        <Pressable onPress={() => setAttempt((a) => a + 1)} style={t.secondaryBtn}>
          <Text style={t.secondaryBtnText}>⚠️ جعبه‌ی لایتنر بارگذاری نشد — تلاش دوباره</Text>
        </Pressable>
      ) : !inBox ? (
        <View style={t.centerBox}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : running && progress ? (
        <View style={[t.card, { marginTop: 16 }]}>
          <Text style={[t.feedbackText, { marginBottom: 10 }]}>
            ⏳ در حال افزودن… {faNum(progress.done)} از {faNum(progress.total)}
            {progress.failed ? ` (${faNum(progress.failed)} خطا)` : ''}
          </Text>
          <View style={t.barTrack}>
            <View
              style={[
                t.barFill,
                { width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` },
              ]}
            />
          </View>
          <Pressable onPress={() => (cancelRef.current = true)} style={t.secondaryBtn}>
            <Text style={t.secondaryBtnText}>⏸️ توقف</Text>
          </Pressable>
        </View>
      ) : remaining.length ? (
        <Pressable onPress={addAll} style={t.primaryBtn}>
          <Text style={t.primaryBtnText}>
            {have
              ? `➕ افزودن ${faNum(remaining.length)} کلمه‌ی باقی‌مانده به لایتنر`
              : `➕ افزودن همه‌ی ${faNum(remaining.length)} کلمه به لایتنر`}
          </Text>
        </Pressable>
      ) : (
        <View style={t.feedbackGood}>
          <Text style={t.feedbackText}>🎉 همه‌ی کلمه‌های این بسته در لایتنر هستند.</Text>
        </View>
      )}
      {result && !running ? <Text style={[t.feedbackText, { marginTop: 12 }]}>{result}</Text> : null}
      {remaining.length > 100 && !running ? (
        <Text style={t.note}>
          افزودن یک‌جای چند صد کلمه یعنی از فردا مرورهای زیادی خواهی داشت؛ هر وقت خواستی می‌توانی
          متوقفش کنی.
        </Text>
      ) : null}

      <Text style={t.sectionHeader}>کلمه‌ها</Text>
      <Segment
        options={[
          { value: 'all', label: 'همه' },
          { value: 'todo', label: 'هنوز نه' },
          { value: 'done', label: 'در لایتنر' },
        ]}
        value={filter}
        onChange={(f) => {
          setFilter(f);
          setShown(PAGE);
        }}
      />

      {visible.slice(0, shown).map((w) => {
        const done = inBox?.has(w.word.toLowerCase());
        return (
          <View
            key={w.word}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              paddingVertical: 10,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
            }}>
            <View style={{ flexShrink: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.ink, writingDirection: 'ltr', textAlign: 'left' }}>
                {w.article ? <Text style={{ color: color(w.article) }}>{w.article} </Text> : null}
                {w.word}
              </Text>
              <Text style={{ fontSize: 13.5, color: colors.secondary, marginTop: 2 }}>{w.fa}</Text>
            </View>
            {done ? <Text style={{ fontSize: 13, color: colors.success, fontWeight: '700' }}>✓ لایتنر</Text> : null}
          </View>
        );
      })}
      {visible.length > shown ? (
        <Pressable onPress={() => setShown((s) => s + PAGE)} style={t.secondaryBtn}>
          <Text style={t.secondaryBtnText}>
            نمایش بیشتر ({faNum(visible.length - shown)} کلمه‌ی دیگر)
          </Text>
        </Pressable>
      ) : null}
    </ScreenScroll>
  );
}
