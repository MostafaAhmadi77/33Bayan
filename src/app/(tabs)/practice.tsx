// صفحه‌ی تمرین: هاب «تمرین‌ها» — مرور جعبه‌ی لایتنر (فلش‌کارت) و ترجمه‌ی متن همین‌جا،
// و تمرین‌های تازه (آرتیکل، بسته‌های Goethe، صرف فعل، جای خالی، تلفظ) هر کدام صفحه‌ی خودشان.
import { Image } from 'expo-image';
import { router, useFocusEffect, useLocalSearchParams, type Href } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { ScreenScroll } from '@/components/screen';
import { SpeakButtons } from '@/components/speak-button';
import { TappableSentence } from '@/components/tappable-sentence';
import { WordPopup } from '@/components/word-popup';
import { useLayoutSize } from '@/hooks/use-layout';
import { leitnerDue, leitnerReview, translate, type LeitnerCard } from '@/lib/api';
import { useAppTheme, type AppTheme } from '@/lib/theme-context';
import { logActivity } from '@/lib/storage';

type Mode = 'hub' | 'review' | 'translate';

type HubTile = {
  emoji: string;
  label: string;
  desc: string;
  mode?: Exclude<Mode, 'hub'>;
  href?: Href;
};

const HUB_TILES: HubTile[] = [
  { emoji: '🔁', label: 'مرور لایتنر', desc: 'کارت‌هایی که وقت مرورشان رسیده', mode: 'review' },
  { emoji: '📝', label: 'ترجمه متن', desc: 'آلمانی ⇄ فارسی', mode: 'translate' },
  { emoji: '🎨', label: 'آرتیکل der/die/das', desc: 'حدس آرتیکل اسم‌ها با رنگ', href: '/articles' },
  { emoji: '📦', label: 'بسته‌های Goethe', desc: 'واژه‌های A1 تا B1 به لایتنر', href: '/word-packs' },
  { emoji: '🔤', label: 'صرف فعل', desc: 'جدول صرف + تمرین جای خالی', href: '/verb-drill' },
  { emoji: '✍️', label: 'جمله‌ی جای خالی', desc: 'کلمه‌ی گم‌شده در جمله‌ی واقعی', href: '/cloze' },
  { emoji: '🎙️', label: 'تمرین تلفظ', desc: 'گوش بده، ضبط کن، مقایسه کن', href: '/pronunciation' },
];
type TranslateResult = { failed: boolean; text: string; from: string; to: string };

export default function PracticeScreen() {
  const { colors, isDark } = useAppTheme();
  const styles = makeStyles(colors, isDark);

  const size = useLayoutSize();
  const params = useLocalSearchParams<{ mode?: string }>();
  const [mode, setMode] = useState<Mode>('hub');
  const [popupWord, setPopupWord] = useState<string | null>(null);

  // ورود مستقیم به یک حالت از صفحه‌ی خانه: /practice?mode=review
  useEffect(() => {
    const m = params.mode;
    if (m === 'review' || m === 'translate' || m === 'hub') {
      setMode(m);
      router.setParams({ mode: undefined });
    }
  }, [params.mode]);

  // ---- مرور لایتنر ----
  const [queue, setQueue] = useState<LeitnerCard[]>([]);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [knownCount, setKnownCount] = useState(0);
  const [dunnoCount, setDunnoCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const r = await leitnerDue();
      setQueue(r.cards || []);
      setIndex(0);
      setRevealed(false);
      setKnownCount(0);
      setDunnoCount(0);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  // بارگذاری هنگام باز شدن صفحه و هر بار برگشتن به حالت مرور
  useEffect(() => {
    if (mode === 'review') load();
  }, [mode, load]);

  const answer = async (known: boolean) => {
    const card = queue[index];
    if (!card || sending) return;
    setSending(true);
    try {
      await leitnerReview(card.id, known);
      await logActivity('review');
      if (known) setKnownCount((c) => c + 1);
      else setDunnoCount((c) => c + 1);
      setRevealed(false);
      setIndex((i) => i + 1);
    } catch {
      // خطای شبکه: روی همان کارت می‌مانیم تا کاربر دوباره تلاش کند
    } finally {
      setSending(false);
    }
  };

  // ---- ترجمه‌ی متن ----
  const [input, setInput] = useState('');
  const [translating, setTranslating] = useState(false);
  const [result, setResult] = useState<TranslateResult | null>(null);
  const [submittedText, setSubmittedText] = useState('');

  // پاک کردن کامل باکس ترجمه (متن، نتیجه، متن ارسالی، وضعیت ترجمه، پاپ‌آپ)
  const clearTranslation = useCallback(() => {
    setInput('');
    setResult(null);
    setSubmittedText('');
    setTranslating(false);
    setPopupWord(null);
  }, []);

  // باکس ترجمه هنگام ترک صفحه (تعویض تب) خالی می‌شود؛ صف مرور دست نمی‌خورد
  useFocusEffect(
    useCallback(() => {
      return () => {
        clearTranslation();
      };
    }, [clearTranslation]),
  );

  // باکس ترجمه هنگام ترک حالت ترجمه (به مرور یا هاب) هم خالی می‌شود
  useEffect(() => {
    if (mode !== 'translate') clearTranslation();
  }, [mode, clearTranslation]);

  const doTranslate = async () => {
    const text = input.trim();
    if (!text || translating) return;
    setTranslating(true);
    setResult(null);
    setSubmittedText(text);
    try {
      const r = await translate(text.slice(0, 2000));
      setResult({ failed: !!r.failed || !r.text, text: r.text || '', from: r.from, to: r.to });
    } catch {
      setResult({ failed: true, text: '', from: 'de', to: 'fa' });
    } finally {
      setTranslating(false);
    }
  };

  const card = queue[index];
  const finished = !loading && !loadError && queue.length > 0 && index >= queue.length;

  return (
    <ScreenScroll>
      {mode === 'hub' ? (
        <>
          <Text style={styles.title}>تمرین‌ها</Text>
          <Text style={styles.hubSub}>یک تمرین انتخاب کن 👇</Text>
          <View style={styles.hubGrid}>
            {HUB_TILES.map((t) => (
              <Pressable
                key={t.label}
                style={[styles.hubTile, size !== 'compact' && { width: '31%' }]}
                onPress={() => (t.mode ? setMode(t.mode) : t.href ? router.push(t.href) : undefined)}>
                <Text style={styles.hubEmoji}>{t.emoji}</Text>
                <Text style={styles.hubLabel}>{t.label}</Text>
                <Text style={styles.hubDesc}>{t.desc}</Text>
              </Pressable>
            ))}
          </View>
        </>
      ) : (
        <>
          <Pressable onPress={() => setMode('hub')} style={styles.backRow}>
            <Text style={styles.backText}>› تمرین‌ها</Text>
          </Pressable>
          <Text style={styles.title}>{mode === 'review' ? '🔁 مرور لایتنر' : '📝 ترجمه متن'}</Text>
        </>
      )}

      {mode === 'hub' ? null : mode === 'review' ? (
        <>
          {loading ? (
            <View style={styles.centerBox}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.hint}>در حال بارگذاری کارت‌ها…</Text>
            </View>
          ) : loadError ? (
            <View style={styles.centerBox}>
              <Text style={styles.bigEmoji}>⚠️</Text>
              <Text style={styles.centerText}>کارت‌ها بارگذاری نشدند. اتصال اینترنت را چک کن.</Text>
              <Pressable onPress={load} style={styles.primaryBtn}>
                <Text style={styles.primaryBtnText}>تلاش دوباره</Text>
              </Pressable>
            </View>
          ) : finished ? (
            <View style={styles.centerBox}>
              <Text style={styles.bigEmoji}>🏁</Text>
              <Text style={styles.centerTitle}>مرور تموم شد!</Text>
              <Text style={styles.centerText}>
                ✅ بلدم: {knownCount} — ❌ بلد نیستم: {dunnoCount}
              </Text>
              <Pressable onPress={load} style={styles.primaryBtn}>
                <Text style={styles.primaryBtnText}>🔄 بارگذاری دوباره</Text>
              </Pressable>
            </View>
          ) : !card ? (
            <View style={styles.centerBox}>
              <Text style={styles.bigEmoji}>🎉</Text>
              <Text style={styles.centerTitle}>امروز کلمه‌ای برای مرور نداری!</Text>
              <Text style={styles.centerText}>
                کلمه‌های لایتنر سر وقتشان اینجا می‌آیند. از بخش جست‌وجو کلمه‌ی تازه اضافه کن.
              </Text>
            </View>
          ) : (
            <>
              <Text style={styles.progress}>
                کارت {index + 1} از {queue.length}
              </Text>
              <View style={styles.card}>
                {card.entry.imageUrl ? (
                  <Image
                    source={{ uri: card.entry.imageUrl }}
                    style={styles.cardImage}
                    contentFit="cover"
                    transition={250}
                  />
                ) : null}
                <View style={styles.cardHead}>
                  <Text style={styles.word} selectable>
                    {card.entry.speak}
                  </Text>
                  <Text style={styles.boxChip}>خانه‌ی {card.box}</Text>
                </View>
                <View style={{ marginTop: 10 }}>
                  <SpeakButtons text={card.entry.speak} />
                </View>

                {revealed ? (
                  <View style={styles.meaning}>
                    {card.entry.persian ? (
                      <Text style={styles.persian}>{card.entry.persian}</Text>
                    ) : null}
                    {card.entry.plural ? (
                      <Text style={[styles.meta, styles.ltr]}>جمع: {card.entry.plural}</Text>
                    ) : null}
                    {card.entry.english ? (
                      <Text style={[styles.meta, styles.ltr]}>{card.entry.english}</Text>
                    ) : null}
                    {card.entry.example ? (
                      <TappableSentence
                        text={card.entry.example}
                        onWord={setPopupWord}
                        style={{ fontSize: 14.5, lineHeight: 22, marginTop: 6, color: colors.secondary }}
                      />
                    ) : null}
                  </View>
                ) : null}
              </View>

              {revealed ? (
                <View style={styles.answerRow}>
                  <Pressable
                    onPress={() => answer(true)}
                    disabled={sending}
                    style={[styles.knowBtn, sending && styles.disabled]}>
                    <Text style={styles.knowBtnText}>✅ بلدم</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => answer(false)}
                    disabled={sending}
                    style={[styles.dunnoBtn, sending && styles.disabled]}>
                    <Text style={styles.dunnoBtnText}>❌ بلد نیستم</Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable onPress={() => setRevealed(true)} style={styles.primaryBtn}>
                  <Text style={styles.primaryBtnText}>👀 نمایش معنی</Text>
                </Pressable>
              )}
            </>
          )}
        </>
      ) : (
        <>
          <TextInput
            style={styles.input}
            multiline
            value={input}
            onChangeText={setInput}
            placeholder="متن آلمانی یا فارسی رو اینجا بنویس…"
            placeholderTextColor={colors.secondary}
            textAlignVertical="top"
            maxLength={2000}
          />
          <Text style={styles.charNote}>حداکثر ۲۰۰۰ نویسه — جهت ترجمه خودکار تشخیص داده می‌شود</Text>
          <Pressable
            onPress={doTranslate}
            disabled={translating || !input.trim()}
            style={[styles.primaryBtn, (translating || !input.trim()) && styles.disabled]}>
            <Text style={styles.primaryBtnText}>{translating ? 'در حال ترجمه…' : 'ترجمه کن'}</Text>
          </Pressable>

          {translating ? (
            <View style={styles.centerBox}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : result ? (
            result.failed ? (
              <View style={styles.centerBox}>
                <Text style={styles.centerText}>⚠️ سرویس ترجمه الان در دسترس نیست.</Text>
              </View>
            ) : (
              <View style={styles.resultCard}>
                <Text style={styles.dirLabel}>
                  {result.from === 'de' ? '📝 ترجمه 🇩🇪 → 🇮🇷' : '📝 ترجمه 🇮🇷 → 🇩🇪'}
                </Text>
                {result.to === 'de' ? (
                  <TappableSentence
                    text={result.text}
                    onWord={setPopupWord}
                    bullet={false}
                    style={styles.resultText}
                  />
                ) : (
                  <Text style={styles.resultText} selectable>
                    {result.text}
                  </Text>
                )}
                <View style={{ marginTop: 12 }}>
                  <SpeakButtons text={result.from === 'de' ? submittedText : result.text} />
                </View>
              </View>
            )
          ) : null}
        </>
      )}

      <WordPopup word={popupWord} onClose={() => setPopupWord(null)} />
    </ScreenScroll>
  );
}

function makeStyles(colors: AppTheme['colors'], isDark: boolean) {
  return StyleSheet.create({
    title: { fontSize: 26, fontWeight: '800', color: colors.ink, marginBottom: 14 },
    backRow: { alignSelf: 'flex-start', paddingVertical: 4, marginBottom: 8 },
    backText: { fontSize: 15, fontWeight: '700', color: colors.primaryDeep },
    hubSub: { fontSize: 15, color: colors.secondary, marginTop: -6, marginBottom: 16 },
    hubGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    hubTile: {
      width: '47%',
      flexGrow: 1,
      backgroundColor: colors.soft,
      borderRadius: colors.radius,
      paddingVertical: 18,
      paddingHorizontal: 12,
      alignItems: 'center',
      gap: 6,
    },
    hubEmoji: { fontSize: 30 },
    hubLabel: { fontSize: 15, fontWeight: '700', color: colors.ink, textAlign: 'center' },
    hubDesc: { fontSize: 12.5, color: colors.secondary, textAlign: 'center', lineHeight: 19 },
    progress: { fontSize: 13, color: colors.secondary, marginBottom: 10 },
    card: { backgroundColor: colors.soft, borderRadius: colors.radius, padding: 18 },
    cardImage: { width: '100%', aspectRatio: 16 / 9, borderRadius: 16, marginBottom: 14, backgroundColor: colors.card },
    cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
    word: { fontSize: 28, fontWeight: '800', color: colors.ink, writingDirection: 'ltr', textAlign: 'left', flexShrink: 1 },
    boxChip: {
      backgroundColor: colors.chip,
      color: colors.primaryDeep,
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: 999,
      fontSize: 13,
      overflow: 'hidden',
    },
    meaning: { marginTop: 16, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 14 },
    persian: { fontSize: 22, fontWeight: '700', color: colors.primaryDeep },
    meta: { fontSize: 14, color: colors.secondary, marginTop: 6 },
    ltr: { writingDirection: 'ltr', textAlign: 'left' },
    primaryBtn: {
      backgroundColor: colors.primary,
      borderRadius: 14,
      paddingVertical: 13,
      alignItems: 'center',
      marginTop: 16,
    },
    primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
    answerRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
    knowBtn: { flex: 1, backgroundColor: colors.success, borderRadius: 14, paddingVertical: 13, alignItems: 'center' },
    knowBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
    dunnoBtn: { flex: 1, backgroundColor: isDark ? colors.soft : '#FFEDED', borderRadius: 14, paddingVertical: 13, alignItems: 'center' },
    dunnoBtnText: { color: colors.danger, fontSize: 15, fontWeight: '700' },
    disabled: { opacity: 0.55 },
    centerBox: { alignItems: 'center', paddingVertical: 34, gap: 8 },
    bigEmoji: { fontSize: 44 },
    centerTitle: { fontSize: 19, fontWeight: '800', color: colors.ink, textAlign: 'center' },
    centerText: { fontSize: 15, color: colors.secondary, textAlign: 'center', lineHeight: 24 },
    hint: { fontSize: 14, color: colors.secondary },
    input: {
      minHeight: 110,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      padding: 14,
      fontSize: 16,
      color: colors.ink,
      backgroundColor: colors.card,
    },
    charNote: { fontSize: 12, color: colors.secondary, marginTop: 8 },
    resultCard: {
      marginTop: 20,
      backgroundColor: colors.soft,
      borderRadius: colors.radius,
      padding: 18,
    },
    dirLabel: { fontSize: 13, fontWeight: '700', color: colors.primaryDeep, marginBottom: 8 },
    resultText: { fontSize: 17, lineHeight: 27, color: colors.ink },
  });
}
