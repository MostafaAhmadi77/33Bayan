// نمایش کامل یک مدخل دیکشنری: تصویر، آرتیکل/جمع، معنی فارسی، تعریف‌ها، مثال‌ها،
// مترادف/متضاد و ترکیب‌های رایج + دکمه‌ی افزودن به لایتنر
import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Brand } from '@/constants/theme';
import type { Entry } from '@/lib/api';

import { SpeakButtons } from './speak-button';

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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

export function EntryView({
  entry,
  onAdd,
}: {
  entry: Entry;
  onAdd?: (baseDays: 1 | 3 | 7) => Promise<void>;
}) {
  const [interval, setInterval] = useState<1 | 3 | 7>(1);
  const [added, setAdded] = useState(false);
  const [busy, setBusy] = useState(false);

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
        <Section title="📖 معنی‌ها (آلمانی)">
          {entry.definitions.map((d, i) => (
            <Text key={i} style={[styles.line, styles.ltr]}>
              {i + 1}. {d}
            </Text>
          ))}
        </Section>
      ) : null}

      {entry.examples.length ? (
        <Section title="💬 مثال‌ها">
          {entry.examples.map((x, i) => (
            <Text key={i} style={[styles.line, styles.ltr]}>
              • {x}
            </Text>
          ))}
        </Section>
      ) : null}

      {entry.dwdsExamples.length ? (
        <Section title="📚 مثال (DWDS)">
          {entry.dwdsExamples.map((x, i) => (
            <Text key={i} style={[styles.line, styles.ltr]}>
              • {x}
            </Text>
          ))}
        </Section>
      ) : null}

      {entry.collocations.length ? (
        <Section title="🔗 ترکیب‌های رایج">
          <Text style={[styles.line, styles.ltr]}>{entry.collocations.join(' • ')}</Text>
        </Section>
      ) : null}

      {entry.synonyms.length ? (
        <Section title="🟰 مترادف">
          <Text style={[styles.line, styles.ltr]}>{entry.synonyms.join('، ')}</Text>
        </Section>
      ) : null}

      {entry.antonyms.length ? (
        <Section title="➖ متضاد">
          <Text style={[styles.line, styles.ltr]}>{entry.antonyms.join('، ')}</Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  image: { width: '100%', height: 210, borderRadius: Brand.radius, backgroundColor: Brand.soft },
  headRow: { flexDirection: 'row', alignItems: 'baseline', gap: 10, marginTop: 14, flexWrap: 'wrap' },
  word: { fontSize: 30, fontWeight: '800', color: Brand.ink, writingDirection: 'ltr' },
  ipa: { fontSize: 15, color: Brand.secondary, writingDirection: 'ltr' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  chip: {
    backgroundColor: Brand.chip,
    color: Brand.primaryDeep,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    fontSize: 13,
    overflow: 'hidden',
  },
  chipLtr: { writingDirection: 'ltr' },
  chipActive: { backgroundColor: Brand.primary, color: '#fff' },
  persian: { fontSize: 22, fontWeight: '700', color: Brand.primaryDeep, marginTop: 12 },
  section: { marginTop: 18 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: Brand.ink, marginBottom: 6 },
  line: { fontSize: 15, lineHeight: 24, color: '#3D3D5C' },
  ltr: { writingDirection: 'ltr', textAlign: 'left' },
  addBox: {
    marginTop: 22,
    backgroundColor: Brand.soft,
    borderRadius: Brand.radius,
    padding: 16,
  },
  addTitle: { fontSize: 14, fontWeight: '700', color: Brand.ink, marginBottom: 4 },
  addBtn: {
    backgroundColor: Brand.primary,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  addBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  addedText: { fontSize: 15, fontWeight: '700', color: Brand.success, textAlign: 'center' },
});
