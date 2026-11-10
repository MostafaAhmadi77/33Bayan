// متن آلمانی با کلمه‌های قابل لمس: روی هر کلمه بزنی، کال‌بک با شکل پاک‌شده‌ی
// کلمه (بدون نشانه‌گذاری‌های دو سرش) صدا زده می‌شود تا پاپ‌آپ معنی‌اش باز شود.
import { StyleSheet, Text, type TextStyle } from 'react-native';

import { Brand } from '@/constants/theme';

export function TappableSentence({
  text,
  onWord,
  style,
  wordColor,
  bullet = true,
}: {
  text: string;
  onWord: (w: string) => void;
  style?: TextStyle;
  wordColor?: string;
  bullet?: boolean;
}) {
  const tokens = text.split(/(\s+)/);
  return (
    <Text style={[styles.base, style]}>
      {bullet ? '• ' : null}
      {tokens.map((tok, i) => {
        if (!tok || /^\s+$/.test(tok)) return tok;
        // نشانه‌گذاری‌های دو سرِ توکن (نقطه، ویرگول، گیومه…) جزو کلمه نیستند
        const cleaned = tok.replace(/^[\p{P}\p{S}]+|[\p{P}\p{S}]+$/gu, '');
        if (cleaned.length >= 2 && /\p{L}/u.test(cleaned)) {
          return (
            <Text
              key={i}
              style={{ color: wordColor ?? Brand.primaryDeep }}
              onPress={() => onWord(cleaned)}>
              {tok}
            </Text>
          );
        }
        return tok;
      })}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: { writingDirection: 'ltr', textAlign: 'left' },
});
