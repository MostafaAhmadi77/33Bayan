// نمایش کامل یک مدخل دیکشنری: هیروی عکس با کلمه روی آن، کارت‌های شیشه‌ای
// (چیپ‌ها + معنی فارسی)، تعریف‌ها، مثال‌ها، مترادف/متضاد و ترکیب‌های رایج
// + دکمه‌ی افزودن به لایتنر — طراحی «شیشه تیره» (v1.5.0)
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { fetchLevelExamples, type Entry, type LevelExample } from '@/lib/api';
import {
  getExampleCount,
  getExampleLevel,
  type ExampleLevel,
} from '@/lib/storage';
import { useAppTheme } from '@/lib/theme-context';

import { SensesView } from './senses-view';
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

/** کلمه‌ی سرخط (entry.speak) خودش آرتیکل را دارد («der Baum»)؛ برای رنگِ
    بنفشِ آرتیکل روی هیرو، همان رشته را دو تکه می‌کنیم — بدون تکرار.
    اگر speak با آرتیکل شروع نشد (مثلاً مدخل موقتِ محلی)، یک‌تکه برمی‌گردد. */
function splitHeadword(entry: Entry): { article: string | null; rest: string } {
  if (entry.article && entry.speak.startsWith(entry.article + ' ')) {
    return { article: entry.article, rest: entry.speak.slice(entry.article.length + 1) };
  }
  return { article: null, rest: entry.speak };
}

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
  loadingFull,
  onRetry,
}: {
  entry: Entry;
  onAdd?: (baseDays: 1 | 3 | 7) => Promise<void>;
  onLookupWord?: (word: string) => void;
  /** جست‌وجوی سرور برای تکمیل مدخل موقت هنوز در جریان است */
  loadingFull?: boolean;
  /** تلاش دوباره برای آوردن معنی کاملِ مدخل موقت */
  onRetry?: () => void;
}) {
  const { colors, isDark } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);
  const [interval, setInterval] = useState<1 | 3 | 7>(1);
  const [added, setAdded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [popupWord, setPopupWord] = useState<string | null>(null);

  // ---- مثال‌ها: تعداد و سطح از پروفایل می‌آید ----
  const [exCount, setExCount] = useState(2);
  const [exLevel, setExLevel] = useState<ExampleLevel>('B1');
  const [generated, setGenerated] = useState<LevelExample[]>([]);
  const [topping, setTopping] = useState(false);

  // همه‌ی مثال‌های دیکشنری + DWDS + Tatoeba، بدون تکرار.
  // مثال‌های Tatoeba ترجمه‌ی فارسی آماده دارند.
  const pool = useMemo(() => {
    const seen = new Set<string>();
    const items: { de: string; fa?: string; tatoeba?: boolean }[] = [
      ...entry.examples.map((de) => ({ de: de.trim() })),
      ...entry.dwdsExamples.map((de) => ({ de: de.trim() })),
      ...(entry.tatoebaExamples ?? []).map((x) => ({ de: x.de.trim(), fa: x.fa, tatoeba: true })),
    ];
    return items.filter((x) => {
      if (!x.de || seen.has(x.de)) return false;
      seen.add(x.de);
      return true;
    });
  }, [entry]);

  // مثال‌های دیکشنری وقتی گروه اصلی‌اند تا سقف تعداد خواسته‌شده نشان داده
  // می‌شوند؛ وقتی مثال‌های ساخته‌شده آمدند، فقط تا ۲ تای اول‌شان زیر آن‌ها می‌آیند.
  const dictShown = generated.length ? pool.slice(0, 2) : pool.slice(0, exCount);

  // با هر مدخل تازه: تنظیمات (تعداد و سطح) را بخوان و همیشه به تعداد
  // خواسته‌شده، در سطح کاربر، مثال بساز — نه فقط وقتی مثال‌های دیکشنری کم است.
  // برای مدخلِ موقتِ محلی (entry.local) چیزی ساخته نمی‌شود: مدخل هنوز داده‌ی
  // سرور ندارد و مثالِ ساخته‌شده روی آن غلط از آب درمی‌آید؛ وقتی مدخل واقعی
  // رسید، افکت با آبجکت تازه‌ی entry دوباره اجرا می‌شود.
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
      setExLevel(level);
      if (entry.local) return;
      setTopping(true);
      const r = await fetchLevelExamples(entry.word, level, count);
      if (cancelled) return;
      setTopping(false);
      if (r.ok && r.examples.length) setGenerated(r.examples.slice(0, count));
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

  const { article: heroArticle, rest: heroRest } = splitHeadword(entry);
  const nounDefinitions = entry.nounForm?.definitions ?? [];
  const nounExamples = entry.nounForm?.examples ?? [];
  const alsoTypeLabel =
    entry.also?.type === 'Substantiv' ? 'اسم' : entry.also?.type === 'Verb' ? 'فعل' : entry.also?.type;

  return (
    <View>
      {entry.imageUrl ? (
        <View style={styles.hero}>
          <Image source={{ uri: entry.imageUrl }} style={styles.heroImage} contentFit="cover" transition={250} />
          <LinearGradient
            colors={['rgba(14,13,26,0.05)', 'rgba(14,13,26,0.92)']}
            locations={[0.3, 0.88]}
            style={styles.heroGradient}
          />
          <View style={styles.heroText}>
            {entry.ipa ? <Text style={styles.heroIpa}>/{entry.ipa}/</Text> : null}
            <Text style={styles.heroWord} selectable>
              {heroArticle ? <Text style={styles.heroArticle}>{heroArticle} </Text> : null}
              {heroRest}
            </Text>
          </View>
        </View>
      ) : (
        <View style={styles.headRow}>
          <Text style={styles.word} selectable>
            {entry.speak}
          </Text>
          {entry.ipa ? <Text style={styles.ipa}>/{entry.ipa}/</Text> : null}
        </View>
      )}

      <View style={styles.glass}>
        <View style={styles.chips}>
          {entry.type ? <Text style={styles.chip}>{TYPE_FA[entry.type] || entry.type}</Text> : null}
          {entry.cefr ? <Text style={styles.chip}>سطح {entry.cefr}</Text> : null}
          {entry.plural ? <Text style={[styles.chip, styles.chipGreen]}>جمع: {entry.pluralFull}</Text> : null}
          {entry.english ? <Text style={[styles.chip, styles.chipLtr]}>{entry.english}</Text> : null}
        </View>

        {entry.persian ? <Text style={styles.persian}>{entry.persian}</Text> : null}

        <SensesView word={entry.word} />

        {entry.formOf ? (
          <Text style={styles.formOfNote} selectable>
            «{entry.formOf.form}» صورتِ صرف‌شده‌ی «{entry.formOf.base}» است — {entry.formOf.grammar}
          </Text>
        ) : null}

        {entry.also ? (
          <Text style={styles.formOfNote} selectable>
            همچنین {alsoTypeLabel}: {entry.also.article ? `${entry.also.article} ` : ''}
            {entry.also.word}
            {entry.also.persian ? ` — ${entry.also.persian}` : ''}
          </Text>
        ) : null}

        {entry.reflexive ? (
          <View style={styles.reflexiveRow}>
            <Text style={styles.chip}>فعل انعکاسی (sich)</Text>
          </View>
        ) : null}
      </View>

      {entry.nounForm ? (
        <Section title="📎 به‌عنوان اسم" styles={styles}>
          <View style={styles.nounFormRow}>
            {entry.nounForm.article ? (
              <Text style={styles.articleSmall}>{entry.nounForm.article}</Text>
            ) : null}
            <TappableSentence text={entry.nounForm.word} onWord={openWord} style={styles.line} bullet={false} />
          </View>
          {entry.nounForm.persian ? (
            <Text style={styles.nounFormPersian}>{entry.nounForm.persian}</Text>
          ) : null}

          {nounDefinitions.length ? (
            <>
              <Text style={styles.subHeader}>📖 معنی‌ها (آلمانی)</Text>
              {nounDefinitions.map((d, i) => (
                <TranslatableText
                  key={`noun-def-${i}`}
                  text={d}
                  number={i + 1}
                  onWord={openWord}
                  style={styles.line}
                />
              ))}
            </>
          ) : null}

          {nounExamples.length ? (
            <>
              <Text style={styles.subHeader}>💬 مثال‌ها</Text>
              {nounExamples.map((x, i) => (
                <TranslatableText key={`noun-ex-${i}`} text={x.de} onWord={openWord} style={styles.line} />
              ))}
            </>
          ) : null}
        </Section>
      ) : null}

      {/* فقط برای فعل‌ها: رفتن به صفحه‌ی صرف فعل */}
      {entry.type === 'Verb' ? (
        <Pressable
          onPress={() =>
            router.push({
              pathname: '/conjugation',
              params: { word: entry.word, persian: entry.persian ?? '', ipa: entry.ipa ?? '' },
            })
          }
          style={styles.conjRow}>
          <Text style={styles.conjTitle}>📝 صرف فعل</Text>
          <Text style={styles.conjChevron}>‹</Text>
        </Pressable>
      ) : null}

      <View style={{ marginTop: 10 }}>
        <SpeakButtons text={entry.speak} />
      </View>

      {/* مدخل موقتِ محلی: یا معنی کامل در راه است، یا نرسیده و تلاش دوباره می‌خواهد.
          برای مدخل واقعیِ سرور هیچ‌کدام از این دو ردیف نشان داده نمی‌شود. */}
      {entry.local && loadingFull ? (
        <View style={styles.toppingRow}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.toppingText}>⏳ در حال آوردن معنی کامل…</Text>
        </View>
      ) : null}
      {entry.local && !loadingFull && onRetry ? (
        <Pressable onPress={onRetry} style={styles.toppingRow}>
          <Text style={styles.toppingText}>⚠️ معنی کامل نرسید — برای تلاش دوباره بزن</Text>
        </Pressable>
      ) : null}

      {entry.definitions.length ? (
        <Section title="📖 معنی‌ها (آلمانی)" styles={styles}>
          {entry.definitions.map((d, i) => (
            <TranslatableText key={i} text={d} number={i + 1} onWord={openWord} style={styles.line} />
          ))}
        </Section>
      ) : null}

      {/* مثال‌ها: گروه اصلی مثال‌های ساخته‌شده برای سطح و تعداد کاربر است؛
          زیر آن تا ۲ مثال از دیکشنری می‌آید. اگر ساخت مثال ناموفق بود،
          مثال‌های دیکشنری تا سقف تعداد خواسته‌شده نشان داده می‌شوند.
          همه با آیکون 🌐 ترجمه‌ی فارسی دارند. */}
      {generated.length + dictShown.length > 0 || topping ? (
        <Section title="💬 مثال‌ها" styles={styles}>
          {generated.length ? (
            <>
              <Text style={styles.subHeader}>
                ساخته‌شده برای سطح {exLevel} • {exCount} مثال
              </Text>
              {generated.map((g, i) => (
                <TranslatableText
                  key={`gen-${i}`}
                  text={g.de}
                  prefetchedPersian={g.fa}
                  onWord={openWord}
                  style={styles.line}
                />
              ))}
            </>
          ) : null}
          {dictShown.length ? (
            <>
              <Text style={styles.subHeader}>📚 از دیکشنری</Text>
              {dictShown.map((x, i) => (
                <TranslatableText
                  key={`pool-${i}`}
                  text={x.de}
                  prefetchedPersian={x.fa}
                  onWord={openWord}
                  style={styles.line}
                />
              ))}
              {dictShown.some((x) => x.tatoeba) ? (
                <Text style={styles.sourceNote}>مثال‌های واقعی از Tatoeba (CC BY)</Text>
              ) : null}
            </>
          ) : null}
          {topping && generated.length + dictShown.length === 0 ? (
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

function makeStyles(colors: ThemeColors, isDark: boolean) {
  // پایه‌ی کارت شیشه‌ای؛ در تم روشن سایه‌ی ملایم هم می‌گیرد، در تیره نه.
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
    // هیرو: عکسِ تمام‌عرض با گرادیانِ تیره و کلمه روی آن (مثل موکاپ B)
    hero: {
      height: 280,
      borderRadius: colors.radius,
      overflow: 'hidden',
      backgroundColor: colors.soft,
    },
    heroImage: { ...StyleSheet.absoluteFill },
    heroGradient: { ...StyleSheet.absoluteFill },
    heroText: {
      position: 'absolute',
      left: 18,
      right: 18,
      bottom: 14,
      direction: 'ltr',
      alignItems: 'flex-start',
    },
    heroIpa: { fontSize: 13, color: '#C9C2E8', writingDirection: 'ltr' },
    heroWord: { fontSize: 40, fontWeight: '900', color: '#FFFFFF', writingDirection: 'ltr', lineHeight: 46 },
    heroArticle: { color: '#B9A7FF' },
    // سرخطِ ساده وقتی مدخل عکس ندارد — بدون فاصله‌ی خالی
    headRow: { flexDirection: 'row', alignItems: 'baseline', gap: 10, marginTop: 2, flexWrap: 'wrap' },
    word: { fontSize: 30, fontWeight: '800', color: colors.ink, writingDirection: 'ltr' },
    nounFormRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
    articleSmall: { fontSize: 15, fontWeight: '700', color: colors.primaryDeep, writingDirection: 'ltr' },
    nounFormPersian: { fontSize: 16, fontWeight: '700', color: colors.primaryDeep, marginTop: 4 },
    ipa: { fontSize: 15, color: colors.secondary, writingDirection: 'ltr' },
    // کارت شیشه‌ایِ اصلی (چیپ‌ها + معنی فارسی)
    glass: { ...glassBase, marginTop: 14 },
    // ردیف رفتن به صفحه‌ی صرف فعل (فقط فعل‌ها)
    conjRow: {
      ...glassBase,
      marginTop: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    conjTitle: { fontSize: 15, fontWeight: '700', color: colors.primaryDeep },
    conjChevron: { fontSize: 20, fontWeight: '700', color: colors.secondary },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
      backgroundColor: colors.chipTint,
      color: colors.chipTintText,
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: 999,
      fontSize: 13,
      overflow: 'hidden',
    },
    chipGreen: { backgroundColor: colors.chipGreen, color: colors.chipGreenText },
    chipLtr: { writingDirection: 'ltr' },
    chipActive: { backgroundColor: colors.primary, color: '#fff' },
    persian: { fontSize: 26, fontWeight: '800', color: colors.ink, marginTop: 12 },
    formOfNote: { fontSize: 13, lineHeight: 20, color: colors.secondary, marginTop: 10 },
    reflexiveRow: { flexDirection: 'row', marginTop: 10 },
    section: { ...glassBase, marginTop: 14 },
    sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.primaryDeep, marginBottom: 6 },
    subHeader: { fontSize: 13, fontWeight: '700', color: colors.secondary, marginTop: 6, marginBottom: 2 },
    sourceNote: { fontSize: 11, color: colors.secondary, marginTop: 4 },
    toppingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
    toppingText: { fontSize: 13, color: colors.secondary },
    line: { fontSize: 15, lineHeight: 24, color: colors.ink },
    addBox: { ...glassBase, marginTop: 14 },
    addTitle: { fontSize: 14, fontWeight: '700', color: colors.ink, marginBottom: 8 },
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
