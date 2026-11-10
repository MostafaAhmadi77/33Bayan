// صفحه‌ی دیکشنری: جست‌وجوی آلمانی → فارسی و فارسی → آلمانی
// نتیجه‌ی آلمانی کارت کامل مدخل را نشان می‌دهد؛ نتیجه‌ی فارسی فهرست معادل‌هاست
// و با لمس هر معادل، کارت کامل همان کلمه باز می‌شود.
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { EntryView } from '@/components/entry-view';
import { Brand } from '@/constants/theme';
import {
  lookupGerman,
  lookupPersian,
  leitnerAdd,
  type Entry,
} from '@/lib/api';
import { getRecent, logActivity, pushRecent, setLastWord } from '@/lib/storage';

type Dir = 'de' | 'fa';
type Equivalent = { de: string; entry: Entry | null };
type Status = 'idle' | 'loading' | 'error' | 'notFound' | 'result';

const hasPersian = (s: string) => /[\u0600-\u06FF]/.test(s);

export default function ExploreScreen() {
  const [dir, setDir] = useState<Dir>('de');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [searched, setSearched] = useState('');
  const [entry, setEntry] = useState<Entry | null>(null);
  const [equivalents, setEquivalents] = useState<Equivalent[]>([]);
  const [selected, setSelected] = useState<Entry | null>(null);
  const [recent, setRecent] = useState<string[]>([]);

  const reloadRecent = useCallback(async () => {
    setRecent(await getRecent());
  }, []);

  useEffect(() => {
    reloadRecent();
  }, [reloadRecent]);

  const makeOnAdd = (e: Entry) => async (baseDays: 1 | 3 | 7) => {
    await leitnerAdd(e, baseDays);
    await logActivity('add');
  };

  const search = useCallback(
    async (raw: string, direction: Dir) => {
      const q = raw.trim();
      if (!q) return;
      setQuery(q);
      setDir(direction);
      setSearched(q);
      setStatus('loading');
      setSelected(null);
      setEntry(null);
      setEquivalents([]);
      try {
        if (direction === 'de') {
          const r = await lookupGerman(q);
          if (r.found && r.entry) {
            setEntry(r.entry);
            setStatus('result');
            await pushRecent(r.entry.word);
            await setLastWord(r.entry.word);
          } else {
            setStatus('notFound');
          }
        } else {
          const r = await lookupPersian(q);
          if (r.found && r.equivalents.length) {
            setEquivalents(r.equivalents);
            setStatus('result');
            await pushRecent(q);
          } else {
            setStatus('notFound');
          }
        }
      } catch {
        setStatus('error');
      } finally {
        reloadRecent();
      }
    },
    [reloadRecent],
  );

  const submit = () => search(query, dir);

  const tapRecent = (word: string) => {
    search(word, hasPersian(word) ? 'fa' : 'de');
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>دیکشنری آلمانی ⇄ فارسی</Text>

      {/* انتخاب جهت */}
      <View style={styles.segment}>
        <Pressable
          onPress={() => setDir('de')}
          style={[styles.segmentBtn, dir === 'de' && styles.segmentBtnActive]}>
          <Text style={[styles.segmentText, dir === 'de' && styles.segmentTextActive]}>
            آلمانی → فارسی
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setDir('fa')}
          style={[styles.segmentBtn, dir === 'fa' && styles.segmentBtnActive]}>
          <Text style={[styles.segmentText, dir === 'fa' && styles.segmentTextActive]}>
            فارسی → آلمانی
          </Text>
        </Pressable>
      </View>

      {/* ردیف جست‌وجو */}
      <View style={styles.searchRow}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={submit}
          placeholder={
            dir === 'de' ? 'یه کلمه‌ی آلمانی بنویس…' : 'یه کلمه‌ی فارسی بنویس…'
          }
          placeholderTextColor={Brand.secondary}
          style={[styles.input, dir === 'de' && styles.inputLtr]}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Pressable onPress={submit} style={styles.searchBtn}>
          <Text style={styles.searchBtnText}>جست‌وجو</Text>
        </Pressable>
      </View>

      {/* جست‌وجوهای اخیر */}
      {recent.length > 0 && status !== 'loading' ? (
        <View style={styles.recentBox}>
          <Text style={styles.recentTitle}>جست‌وجوهای اخیر</Text>
          <View style={styles.chips}>
            {recent.map((w) => (
              <Pressable key={w} onPress={() => tapRecent(w)}>
                <Text style={styles.chip}>{w}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      {/* حالت‌ها */}
      {status === 'loading' ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={Brand.primary} />
          <Text style={styles.hint}>دارم می‌گردم…</Text>
        </View>
      ) : null}

      {status === 'error' ? (
        <View style={styles.centerBox}>
          <Text style={styles.message}>⚠️ اتصال برقرار نشد؛ دوباره تلاش کن</Text>
          <Pressable onPress={() => search(searched, dir)} style={styles.retryBtn}>
            <Text style={styles.retryText}>تلاش دوباره</Text>
          </Pressable>
        </View>
      ) : null}

      {status === 'notFound' ? (
        <View style={styles.centerBox}>
          <Text style={styles.message}>
            😕 «{searched}» پیدا نشد. املای کلمه رو چک کن.
          </Text>
        </View>
      ) : null}

      {/* نتیجه‌ی آلمانی → فارسی */}
      {status === 'result' && dir === 'de' && entry ? (
        <View style={styles.card}>
          <EntryView entry={entry} onAdd={makeOnAdd(entry)} />
        </View>
      ) : null}

      {/* نتیجه‌ی فارسی → آلمانی: جزئیات یک معادل */}
      {status === 'result' && dir === 'fa' && selected ? (
        <View>
          <Pressable onPress={() => setSelected(null)}>
            <Text style={styles.backText}>← برگشت به معادل‌ها</Text>
          </Pressable>
          <View style={styles.card}>
            <EntryView entry={selected} onAdd={makeOnAdd(selected)} />
          </View>
        </View>
      ) : null}

      {/* نتیجه‌ی فارسی → آلمانی: فهرست معادل‌ها */}
      {status === 'result' && dir === 'fa' && !selected ? (
        <View>
          <Text style={styles.eqTitle}>معادل‌های آلمانی «{searched}»:</Text>
          {equivalents.map((eq, i) => (
            <Pressable
              key={`${eq.de}-${i}`}
              disabled={!eq.entry}
              onPress={() => eq.entry && setSelected(eq.entry)}
              style={[styles.eqRow, !eq.entry && styles.eqRowDisabled]}>
              <Text style={styles.eqDe}>
                {eq.entry?.article ? `${eq.entry.article} ` : ''}
                {eq.de}
              </Text>
              {eq.entry?.persian ? (
                <Text style={styles.eqFa}>{eq.entry.persian}</Text>
              ) : null}
            </Pressable>
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: '800', color: Brand.ink, marginBottom: 16 },
  segment: {
    flexDirection: 'row',
    backgroundColor: Brand.soft,
    borderRadius: 999,
    padding: 4,
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: 10,
    alignItems: 'center',
  },
  segmentBtnActive: { backgroundColor: Brand.primary },
  segmentText: { fontSize: 14, fontWeight: '700', color: Brand.secondary },
  segmentTextActive: { color: '#fff' },
  searchRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: Brand.border,
    backgroundColor: Brand.soft,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: Brand.ink,
  },
  inputLtr: { writingDirection: 'ltr', textAlign: 'left' },
  searchBtn: {
    backgroundColor: Brand.primary,
    borderRadius: 16,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  recentBox: { marginTop: 18 },
  recentTitle: { fontSize: 13, fontWeight: '700', color: Brand.secondary, marginBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    backgroundColor: Brand.chip,
    color: Brand.primaryDeep,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    fontSize: 13,
    overflow: 'hidden',
  },
  centerBox: { alignItems: 'center', marginTop: 48, gap: 12 },
  hint: { fontSize: 14, color: Brand.secondary },
  message: { fontSize: 16, color: Brand.ink, textAlign: 'center', lineHeight: 26 },
  retryBtn: {
    backgroundColor: Brand.primary,
    borderRadius: 999,
    paddingHorizontal: 22,
    paddingVertical: 10,
  },
  retryText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  card: {
    marginTop: 20,
    borderWidth: 1,
    borderColor: Brand.border,
    borderRadius: Brand.radius,
    padding: 16,
    backgroundColor: '#fff',
  },
  backText: {
    marginTop: 20,
    fontSize: 14,
    fontWeight: '700',
    color: Brand.primaryDeep,
  },
  eqTitle: { fontSize: 15, fontWeight: '700', color: Brand.ink, marginTop: 20, marginBottom: 10 },
  eqRow: {
    borderWidth: 1,
    borderColor: Brand.border,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 10,
    backgroundColor: '#fff',
  },
  eqRowDisabled: { opacity: 0.45 },
  eqDe: { fontSize: 19, fontWeight: '700', color: Brand.ink, writingDirection: 'ltr', textAlign: 'left' },
  eqFa: { fontSize: 13, color: Brand.secondary, marginTop: 3 },
});
