// نمایش کامل یک مدخل دیکشنری: تصویر، آرتیکل/جمع، معنی فارسی، تعریف‌ها، مثال‌ها،
// مترادف/متضاد و ترکیب‌های رایج + دکمه‌ی افزودن به لایتنر
import { Image } from 'expo-image';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { fetchLevelExamples, type Entry, type LevelExample } from '@/lib/api';
import {
  getExampleCount,
  getExampleLevel,
  type ExampleLevel,
} from '@/lib/storage';
import { useAppTheme } from '@/lib/theme-context';

import { SpeakButtons } from './speak-button';
import { TappableSentence } from './tappable-sentence';
import { TranslatableText } from './translatable-text';
import { WordPopup } from './word-popup';

type ThemeColors = ReturnType<typeof useAppTheme>['colors'];
type Styles = ReturnType<typeof makeStyles>;

const TYPE_FA: Record<string, string> = {
  Substantiv: 'اسم',
  Verb: 'فعل',
  Adjektiv: 'صفت',
  Adverb: 'قید',
  Pronomen: 'ضمیر',
  'Präposition': 'حرف اضافه',
  Konjunktion: 'حرف ربط',
  Interjektion: 'صوت',
  Artikel: 'حرف تعریف',
};

function Section({ title, children, styles }: { title: string; children: React.ReactNode; styles: Styles }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

/** متن داخل پرانتزِ چیپ‌های مترادف/متضاد (مثل برچسب سبک) جزو خود کلمه نیست */
function cleanChip(s: string): string {
  return s.replace(/\([^)]*\)/g, '').replace(/（[^）]*）/g, '').trim();
}

export function EntryView({
  entry,
  onAdd,
  onLookupWord,
}: {
  entry: Entry;
  onAdd?: (baseDays: 1 | 3 | 7) => Promise<void>;
  onLookupWord?: (word: string) => void;
}) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [interval, setInterval] = useState<1 | 3 | 7>(1);
  const [added, setAdded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [popupWord, setPopupWord] = useState<string | null>(null);

  // ---- مثال‌ها: تعداد و سطح از پروفایل می‌آید ----
  const [exCount, setExCount] = useState(2);
  const [generated, setGenerated] = useState<LevelExample[]>([]);
  const [topping, setTopping] = useState(false);

  // همه‌ی مثال‌های دیکشنری + DWDS، بدون تکرار
  const pool = useMemo(() => {
    const seen = new Set<string>();
    return [...entry.examples, ...entry.dwdsExamples]
      .map((s) => s.trim())
      .filter((s) => {
        if (!s || seen.has(s)) return false;
        seen.add(s);
        return true;
      });
  }, [entry]);

  const shownExamples = pool.slice(0, exCount);

  // با هر مدخل تازه: تنظیمات را بخوان؛ اگر مثال‌های آماده کمتر از تعداد
  // خواسته‌شده بود، بقیه را در سطح کاربر از سرور بساز.
  useEffect(() => {
    let cancelled = false;
    setGenerated([]);
    setTopping(false);
    (async () => {
      const [count, level] = await Promise.all([
        getExampleCount().catch(() => 2),
        getExampleLevel().catch((): ExampleLevel => 'B1'),
      ]);
      if (cancelled) return;
      setExCount(count);
      const need = count - pool.length;
      if (need <= 0) return;
      setTopping(true);
      const r = await fetchLevelExamples(entry.word, level, need);
      if (cancelled) return;
      setTopping(false);
      if (r.ok && r.examples.length) setGenerated(r.examples.slice(0, need));
    })();
    return () => {
      cancelled = true;
    };
  }, [entry, pool]);

  const openWord = (w: string) => setPopupWord(w);

  const add = async () => {
    if (!onAdd || busy) return;
    setBusy(true);
    try {
      await onAdd(interval);
      setAdded(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View>
      {entry.imageUrl ? (
        <Image source={{ uri: entry.imageUrl }} style={styles.image} contentFit="cover" transition={250} />
      ) : null}

      <View style={styles.headRow}>
        <Text style={styles.word} selectable>
          {entry.speak}
        </Text>
        {entry.ipa ? <Text style={styles.ipa}>/{entry.ipa}/</Text> : null}
      </View>

      <View style={styles.chips}>
        {entry.type ? <Text style={styles.chip}>{TYPE_FA[entry.type] || entry.type}</Text> : null}
        {entry.plural ? <Text style={styles.chip}>جمع: {entry.pluralFull}</Text> : null}
        {entry.english ? <Text style={[styles.chip, styles.chipLtr]}>{entry.english}</Text> : null}
      </View>

      {entry.persian ? <Text style={styles.persian}>{entry.persian}</Text> : null}

      <View style={{ marginTop: 10 }}>
        <SpeakButtons text={entry.speak} />
      </View>

      {entry.definitions.length ? (
        <Section title="📖 معنی‌ها (آلمانی)" styles={styles}>
          {entry.definitions.map((d, i) => (
            <TranslatableText key={i} text={d} number={i + 1} onWord={openWord} style={styles.line} />
          ))}
        </Section>
      ) : null}

      {/* مثال‌ها: دیکشنری + DWDS در یک بخش؛ اگر کمتر از تعداد خواسته‌شده بود،
          بقیه در سطح کاربر ساخته می‌شوند. همه با آیکون 🌐 ترجمه‌ی فارسی دارند. */}
      {shownExamples.length + generated.length > 0 || topping ? (
        <Section title="💬 مثال‌ها" styles={styles}>
          {shownExamples.map((x, i) => (
            <TranslatableText key={`pool-${i}`} text={x} onWord={openWord} style={styles.line} />
          ))}
          {generated.map((g, i) => (
            <TranslatableText
              key={`gen-${i}`}
              text={g.de}
              prefetchedPersian={g.fa}
              onWord={openWord}
              style={styles.line}
            />
          ))}
          {topping && shownExamples.length + generated.length === 0 ? (
            <View style={styles.toppingRow}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.toppingText}>✨ در حال ساخت مثال…</Text>
            </View>
          ) : null}
        </Section>
      ) : null}

      {entry.collocations.length ? (
        <Section title="🔗 ترکیب‌های رایج" styles={styles}>
          {entry.collocations.map((c, i) => (
            <TappableSentence key={i} text={c} onWord={openWord} style={styles.line} />
          ))}
        </Section>
      ) : null}

      {entry.synonyms.length ? (
        <Section title="🟰 مترادف" styles={styles}>
          <View style={styles.chips}>
            {entry.synonyms.map((s, i) => (
              <Pressable
                key={i}
                onPress={() => {
                  const cleaned = cleanChip(s);
                  if (cleaned) setPopupWord(cleaned);
                }}>
                <Text style={[styles.chip, styles.chipLtr]}>{s}</Text>
              </Pressable>
            ))}
          </View>
        </Section>
      ) : null}

      {entry.antonyms.length ? (
        <Section title="➖ متضاد" styles={styles}>
          <View style={styles.chips}>
            {entry.antonyms.map((s, i) => (
              <Pressable
                key={i}
                onPress={() => {
                  const cleaned = cleanChip(s);
                  if (cleaned) setPopupWord(cleaned);
                }}>
                <Text style={[styles.chip, styles.chipLtr]}>{s}</Text>
              </Pressable>
            ))}
          </View>
        </Section>
      ) : null}

      {onAdd ? (
        <View style={styles.addBox}>
          {added ? (
            <Text style={styles.addedText}>✅ به جعبه‌ی لایتنر اضافه شد</Text>
          ) : (
            <>
              <Text style={styles.addTitle}>📦 افزودن به لایتنر — مرور اول بعد از:</Text>
              <View style={styles.chips}>
                {([1, 3, 7] as const).map((d) => (
                  <Pressable key={d} onPress={() => setInterval(d)}>
                    <Text style={[styles.chip, interval === d && styles.chipActive]}>
                      {d === 1 ? 'هر روز' : d === 3 ? 'هر ۳ روز' : 'هر هفته'}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Pressable onPress={add} style={[styles.addBtn, busy && { opacity: 0.6 }]}>
                <Text style={styles.addBtnText}>{busy ? '…' : 'افزودن به لایتنر'}</Text>
              </Pressable>
            </>
          )}
        </View>
      ) : null}

      <WordPopup
        word={popupWord}
        onClose={() => setPopupWord(null)}
        onOpenFull={
          onLookupWord
            ? () => {
                const w = popupWord;
                setPopupWord(null);
                if (w) onLookupWord(w);
              }
            : undefined
        }
      />
    </View>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    image: {
      width: '100%',
      aspectRatio: 16 / 10,
      maxHeight: 340,
      borderRadius: colors.radius,
      backgroundColor: colors.soft,
    },
    headRow: { flexDirection: 'row', alignItems: 'baseline', gap: 10, marginTop: 14, flexWrap: 'wrap' },
    word: { fontSize: 30, fontWeight: '800', color: colors.ink, writingDirection: 'ltr' },
    ipa: { fontSize: 15, color: colors.secondary, writingDirection: 'ltr' },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
    chip: {
      backgroundColor: colors.chip,
      color: colors.primaryDeep,
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: 999,
      fontSize: 13,
      overflow: 'hidden',
    },
    chipLtr: { writingDirection: 'ltr' },
    chipActive: { backgroundColor: colors.primary, color: '#fff' },
    persian: { fontSize: 22, fontWeight: '700', color: colors.primaryDeep, marginTop: 12 },
    section: { marginTop: 18 },
    sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.ink, marginBottom: 6 },
    toppingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
    toppingText: { fontSize: 13, color: colors.secondary },
    line: { fontSize: 15, lineHeight: 24, color: colors.ink },
    ltr: { writingDirection: 'ltr', textAlign: 'left' },
    addBox: {
      marginTop: 22,
      backgroundColor: colors.soft,
      borderRadius: colors.radius,
      padding: 16,
    },
    addTitle: { fontSize: 14, fontWeight: '700', color: colors.ink, marginBottom: 4 },
    addBtn: {
      backgroundColor: colors.primary,
      borderRadius: 14,
      paddingVertical: 12,
      alignItems: 'center',
      marginTop: 12,
    },
    addBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
    addedText: { fontSize: 15, fontWeight: '700', color: colors.success, textAlign: 'center' },
  });
}
