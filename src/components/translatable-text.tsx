// یک جمله‌ی آلمانی (معمولاً یک تعریف) با آیکون ترجمه:
// با زدن 🌐، ترجمه‌ی فارسی همان جمله از سرور گرفته و زیرش نشان داده می‌شود.
// زدن دوباره‌ی آیکون، ترجمه را جمع می‌کند؛ ترجمه‌ی گرفته‌شده کش می‌شود.
import { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type TextStyle } from 'react-native';

import { translate } from '@/lib/api';
import { useAppTheme } from '@/lib/theme-context';

import { TappableSentence } from './tappable-sentence';

type State = 'idle' | 'loading' | 'shown' | 'hidden' | 'failed';

export function TranslatableText({
  text,
  onWord,
  number,
  style,
  dark = false,
}: {
  text: string;
  onWord: (w: string) => void;
  number?: number;
  style?: TextStyle;
  dark?: boolean;
}) {
  const { colors } = useAppTheme();
  const [state, setState] = useState<State>('idle');
  const [persian, setPersian] = useState<string | null>(null);
  const busy = useRef(false);

  const toggle = async () => {
    if (state === 'shown') {
      setState('hidden');
      return;
    }
    if (state === 'hidden' && persian) {
      setState('shown');
      return;
    }
    if (busy.current) return;
    busy.current = true;
    setState('loading');
    try {
      const r = await translate(text.slice(0, 2000));
      if (r.failed || !r.text) {
        setState('failed');
      } else {
        setPersian(r.text);
        setState('shown');
      }
    } catch {
      setState('failed');
    } finally {
      busy.current = false;
    }
  };

  const germanColor = dark ? '#EDEDF2' : colors.ink;
  const wordColor = dark ? '#AFA3FF' : colors.primaryDeep;
  const faColor = dark ? '#FFFFFF' : colors.primaryDeep;
  const faBg = dark ? 'rgba(255,255,255,0.07)' : colors.soft;
  const iconBg = state === 'shown' ? colors.primary : dark ? 'rgba(255,255,255,0.12)' : colors.chip;

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        {number !== undefined ? <Text style={[styles.num, { color: colors.secondary }]}>{number}.</Text> : null}
        <View style={styles.textBox}>
          <TappableSentence
            text={text}
            onWord={onWord}
            bullet={false}
            wordColor={wordColor}
            style={[styles.base, { color: germanColor }, style]}
          />
        </View>
        <Pressable
          onPress={toggle}
          hitSlop={8}
          accessibilityLabel="ترجمه به فارسی"
          style={[styles.iconBtn, { backgroundColor: iconBg }]}>
          {state === 'loading' ? (
            <ActivityIndicator size="small" color={dark || state === 'shown' ? '#fff' : colors.primaryDeep} />
          ) : (
            <Text style={styles.icon}>{state === 'shown' ? '🔽' : '🌐'}</Text>
          )}
        </Pressable>
      </View>

      {state === 'shown' && persian ? (
        <View style={[styles.faBox, { backgroundColor: faBg }]}>
          <Text style={[styles.faLabel, { color: colors.secondary }]}>ترجمه فارسی</Text>
          <Text style={[styles.faText, { color: faColor }]} selectable>
            {persian}
          </Text>
        </View>
      ) : null}

      {state === 'failed' ? (
        <Text style={[styles.failed, { color: colors.danger }]}>⚠️ ترجمه نشد — دوباره بزن</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  num: { fontSize: 15, lineHeight: 24, writingDirection: 'ltr' },
  textBox: { flex: 1 },
  base: { fontSize: 15, lineHeight: 24 },
  iconBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  icon: { fontSize: 15 },
  faBox: { borderRadius: 12, paddingVertical: 8, paddingHorizontal: 12, marginTop: 6 },
  faLabel: { fontSize: 11, fontWeight: '700', marginBottom: 2 },
  faText: { fontSize: 14.5, lineHeight: 23 },
  failed: { fontSize: 13, marginTop: 4 },
});
