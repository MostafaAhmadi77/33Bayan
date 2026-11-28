import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { lookupSenses, REG_FA } from '@/lib/senses';
import { useAppTheme } from '@/lib/theme-context';

type ThemeColors = ReturnType<typeof useAppTheme>['colors'];
const SHOW = 6;

/** فهرست معنی‌به‌معنی: بازتابی، حرف اضافه + حالت، سطح زبانی و مثال */
export function SensesView({ word }: { word: string }) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const senses = useMemo(() => lookupSenses(word), [word]);
  const [all, setAll] = useState(false);
  if (!senses.length) return null;
  const list = all ? senses : senses.slice(0, SHOW);
  return (
    <View style={styles.box}>
      <Text style={styles.title}>معنی‌ها ({senses.length})</Text>
      {list.map((s, i) => (
        <View key={i} style={styles.row}>
          <Text style={styles.fa} selectable>
            {i + 1}. {s.fa}
          </Text>
          <View style={styles.tags}>
            {s.r ? (
              <Text style={[styles.tag, styles.tagRefl]}>sich ({s.r === 'akk' ? 'Akk' : 'Dat'})</Text>
            ) : null}
            {s.p ? <Text style={[styles.tag, styles.ltr]}>{s.p}</Text> : null}
            {s.g ? <Text style={styles.tag}>{REG_FA[s.g] ?? s.g}</Text> : null}
            {s.d ? <Text style={[styles.tag, styles.ltr]}>{s.d}</Text> : null}
          </View>
          {s.fr ? (
            <Text style={[styles.frame, styles.ltr]} selectable>
              {s.fr}
            </Text>
          ) : null}
          {s.ex ? (
            <Text style={[styles.ex, styles.ltr]} selectable>
              {s.ex}
            </Text>
          ) : null}
          {s.exf ? (
            <Text style={styles.exf} selectable>
              {s.exf}
            </Text>
          ) : null}
        </View>
      ))}
      {senses.length > SHOW ? (
        <Pressable onPress={() => setAll((v) => !v)}>
          <Text style={styles.more}>{all ? 'کمتر' : `همه‌ی ${senses.length} معنی`}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    box: { marginTop: 14 },
    title: { fontSize: 15, fontWeight: '700', color: colors.primaryDeep, marginBottom: 6 },
    row: {
      paddingVertical: 8,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    fa: { fontSize: 17, fontWeight: '700', color: colors.ink, lineHeight: 26 },
    tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
    tag: {
      backgroundColor: colors.chipTint,
      color: colors.chipTintText,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 999,
      fontSize: 12,
      overflow: 'hidden',
    },
    tagRefl: { backgroundColor: colors.primary, color: '#fff' },
    ltr: { writingDirection: 'ltr', textAlign: 'left' },
    frame: { fontSize: 13, color: colors.secondary, marginTop: 4, fontStyle: 'italic' },
    ex: { fontSize: 14, color: colors.ink, marginTop: 4 },
    exf: { fontSize: 13, color: colors.secondary, marginTop: 2, lineHeight: 20 },
    more: { color: colors.primary, fontWeight: '700', marginTop: 8 },
  });
}
