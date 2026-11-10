// صفحه‌ی تمرین: مرور جعبه‌ی لایتنر (فلش‌کارت) + ترجمه‌ی متن
import { Image } from 'expo-image';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Brand } from '@/constants/theme';
import { ScreenScroll } from '@/components/screen';
import { SpeakButtons } from '@/components/speak-button';
import { leitnerDue, leitnerReview, translate, type LeitnerCard } from '@/lib/api';
import { logActivity } from '@/lib/storage';

type Mode = 'review' | 'translate';
type TranslateResult = { failed: boolean; text: string; from: string; to: string };

export default function PracticeScreen() {
  const [mode, setMode] = useState<Mode>('review');

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
      <Text style={styles.title}>تمرین</Text>

      {/* سوییچ حالت */}
      <View style={styles.segment}>
        <Pressable
          onPress={() => setMode('review')}
          style={[styles.segmentBtn, mode === 'review' && styles.segmentBtnActive]}>
          <Text style={[styles.segmentText, mode === 'review' && styles.segmentTextActive]}>
            🔁 مرور لایتنر
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setMode('translate')}
          style={[styles.segmentBtn, mode === 'translate' && styles.segmentBtnActive]}>
          <Text style={[styles.segmentText, mode === 'translate' && styles.segmentTextActive]}>
            📝 ترجمه متن
          </Text>
        </Pressable>
      </View>

      {mode === 'review' ? (
        <>
          {loading ? (
            <View style={styles.centerBox}>
              <ActivityIndicator size="large" color={Brand.primary} />
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
            placeholderTextColor={Brand.secondary}
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
              <ActivityIndicator size="large" color={Brand.primary} />
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
                <Text style={styles.resultText} selectable>
                  {result.text}
                </Text>
                <View style={{ marginTop: 12 }}>
                  <SpeakButtons text={result.from === 'de' ? submittedText : result.text} />
                </View>
              </View>
            )
          ) : null}
        </>
      )}
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 26, fontWeight: '800', color: Brand.ink, marginBottom: 14 },
  segment: {
    flexDirection: 'row',
    backgroundColor: Brand.soft,
    borderRadius: 999,
    padding: 4,
    marginBottom: 20,
  },
  segmentBtn: { flex: 1, paddingVertical: 10, borderRadius: 999, alignItems: 'center' },
  segmentBtnActive: { backgroundColor: Brand.primary },
  segmentText: { fontSize: 14, fontWeight: '700', color: Brand.secondary },
  segmentTextActive: { color: '#fff' },
  progress: { fontSize: 13, color: Brand.secondary, marginBottom: 10 },
  card: { backgroundColor: Brand.soft, borderRadius: Brand.radius, padding: 18 },
  cardImage: { width: '100%', aspectRatio: 16 / 9, borderRadius: 16, marginBottom: 14, backgroundColor: '#fff' },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  word: { fontSize: 28, fontWeight: '800', color: Brand.ink, writingDirection: 'ltr', textAlign: 'left', flexShrink: 1 },
  boxChip: {
    backgroundColor: Brand.chip,
    color: Brand.primaryDeep,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    fontSize: 13,
    overflow: 'hidden',
  },
  meaning: { marginTop: 16, borderTopWidth: 1, borderTopColor: Brand.border, paddingTop: 14 },
  persian: { fontSize: 22, fontWeight: '700', color: Brand.primaryDeep },
  meta: { fontSize: 14, color: Brand.secondary, marginTop: 6 },
  ltr: { writingDirection: 'ltr', textAlign: 'left' },
  primaryBtn: {
    backgroundColor: Brand.primary,
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 16,
  },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  answerRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
  knowBtn: { flex: 1, backgroundColor: Brand.success, borderRadius: 14, paddingVertical: 13, alignItems: 'center' },
  knowBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  dunnoBtn: { flex: 1, backgroundColor: '#FFEDED', borderRadius: 14, paddingVertical: 13, alignItems: 'center' },
  dunnoBtnText: { color: Brand.danger, fontSize: 15, fontWeight: '700' },
  disabled: { opacity: 0.55 },
  centerBox: { alignItems: 'center', paddingVertical: 34, gap: 8 },
  bigEmoji: { fontSize: 44 },
  centerTitle: { fontSize: 19, fontWeight: '800', color: Brand.ink, textAlign: 'center' },
  centerText: { fontSize: 15, color: Brand.secondary, textAlign: 'center', lineHeight: 24 },
  hint: { fontSize: 14, color: Brand.secondary },
  input: {
    minHeight: 110,
    borderWidth: 1,
    borderColor: Brand.border,
    borderRadius: 16,
    padding: 14,
    fontSize: 16,
    color: Brand.ink,
    backgroundColor: '#fff',
  },
  charNote: { fontSize: 12, color: Brand.secondary, marginTop: 8 },
  resultCard: {
    marginTop: 20,
    backgroundColor: Brand.soft,
    borderRadius: Brand.radius,
    padding: 18,
  },
  dirLabel: { fontSize: 13, fontWeight: '700', color: Brand.primaryDeep, marginBottom: 8 },
  resultText: { fontSize: 17, lineHeight: 27, color: Brand.ink },
});
