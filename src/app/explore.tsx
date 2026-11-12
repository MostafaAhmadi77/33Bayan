// صفحه‌ی دیکشنری: جست‌وجوی آلمانی → فارسی و فارسی → آلمانی
// نتیجه‌ی آلمانی کارت کامل مدخل را نشان می‌دهد؛ نتیجه‌ی فارسی فهرست معادل‌هاست
// و با لمس هر معادل، کارت کامل همان کلمه باز می‌شود.
// جست‌وجو خودکار است: ۲ ثانیه بعد از آخرین کلید (debounce) اجرا می‌شود.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { EntryView } from '@/components/entry-view';
import { ScreenScroll } from '@/components/screen';
import {
  lookupGerman,
  lookupPersian,
  leitnerAdd,
  type Entry,
} from '@/lib/api';
import { clearRecent, getRecent, logActivity, pushRecent, setLastWord } from '@/lib/storage';
import { useAppTheme } from '@/lib/theme-context';

type Dir = 'de' | 'fa';
type Equivalent = { de: string; entry: Entry | null };
type Status = 'idle' | 'loading' | 'error' | 'notFound' | 'result';

type ThemeColors = ReturnType<typeof useAppTheme>['colors'];

const hasPersian = (s: string) => /[\u0600-\u06FF]/.test(s);

export default function ExploreScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [dir, setDir] = useState<Dir>('de');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [searched, setSearched] = useState('');
  const [entry, setEntry] = useState<Entry | null>(null);
  const [equivalents, setEquivalents] = useState<Equivalent[]>([]);
  const [selected, setSelected] = useState<Entry | null>(null);
  const [recent, setRecent] = useState<string[]>([]);

  // شناسه‌ی یکنواختِ درخواست‌ها: فقط نتیجه‌ی آخرین جست‌وجو اعمال می‌شود.
  // هر فراخوانی search در ابتدا آن را زیاد می‌کند و بعد از هر await بررسی می‌کند
  // که آیا جست‌وجوی تازه‌تری شروع شده یا نه؛ اگر شده، ادامه را رها می‌کند.
  const searchSeq = useRef(0);

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
      const seq = ++searchSeq.current;
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
          if (seq !== searchSeq.current) return;
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
          if (seq !== searchSeq.current) return;
          if (r.found && r.equivalents.length) {
            setEquivalents(r.equivalents);
            setStatus('result');
            await pushRecent(q);
          } else {
            setStatus('notFound');
          }
        }
      } catch {
        if (seq !== searchSeq.current) return;
        setStatus('error');
      } finally {
        if (seq === searchSeq.current) reloadRecent();
      }
    },
    [reloadRecent],
  );

  // جست‌وجوی خودکار: ۲ ثانیه بعد از اینکه کاربر چیزی تایپ نکرد.
  // هر کلید تایمر را از اول می‌اندازد (cleanup)؛ تغییر جهت هم با همان
  // پرس‌وجوی فعلی بعد از ۲ ثانیه جست‌وجو می‌کند.
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      // خالی شدن باکس: نتیجه‌ی قبلی نماند + جست‌وجوی در حال اجرا باطل شود
      searchSeq.current += 1;
      setSearched('');
      setStatus('idle');
      setEntry(null);
      setEquivalents([]);
      setSelected(null);
      return;
    }
    if (trimmed === searched) return;
    const t = setTimeout(() => {
      void search(query, dir);
    }, 2000);
    return () => clearTimeout(t);
  }, [query, dir, searched, search]);

  const submit = () => search(query, dir);

  const tapRecent = (word: string) => {
    search(word, hasPersian(word) ? 'fa' : 'de');
  };

  const handleClearRecent = useCallback(async () => {
    await clearRecent();
    setRecent([]);
  }, []);

  return (
    <ScreenScroll keyboardShouldPersistTaps="handled">
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
          placeholderTextColor={colors.secondary}
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
          <View style={styles.recentHeader}>
            <Text style={styles.recentTitle}>جست‌وجوهای اخیر</Text>
            <Pressable onPress={handleClearRecent} hitSlop={8}>
              <Text style={styles.clearRecentText}>🗑 پاک کردن</Text>
            </Pressable>
          </View>
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
          <ActivityIndicator size="large" color={colors.primary} />
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
          <EntryView entry={entry} onAdd={makeOnAdd(entry)} onLookupWord={(w) => search(w, 'de')} />
        </View>
      ) : null}

      {/* نتیجه‌ی فارسی → آلمانی: جزئیات یک معادل */}
      {status === 'result' && dir === 'fa' && selected ? (
        <View>
          <Pressable onPress={() => setSelected(null)}>
            <Text style={styles.backText}>← برگشت به معادل‌ها</Text>
          </Pressable>
          <View style={styles.card}>
            <EntryView entry={selected} onAdd={makeOnAdd(selected)} onLookupWord={(w) => search(w, 'de')} />
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
    </ScreenScroll>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    title: { fontSize: 24, fontWeight: '800', color: colors.ink, marginBottom: 16 },
    segment: {
      flexDirection: 'row',
      backgroundColor: colors.soft,
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
    segmentBtnActive: { backgroundColor: colors.primary },
    segmentText: { fontSize: 14, fontWeight: '700', color: colors.secondary },
    segmentTextActive: { color: '#fff' },
    searchRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
    input: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.soft,
      borderRadius: 16,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontSize: 16,
      color: colors.ink,
    },
    inputLtr: { writingDirection: 'ltr', textAlign: 'left' },
    searchBtn: {
      backgroundColor: colors.primary,
      borderRadius: 16,
      paddingHorizontal: 20,
      justifyContent: 'center',
      alignItems: 'center',
    },
    searchBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
    recentBox: { marginTop: 18 },
    recentHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    recentTitle: { fontSize: 13, fontWeight: '700', color: colors.secondary },
    clearRecentText: { fontSize: 13, fontWeight: '700', color: colors.danger },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
      backgroundColor: colors.chip,
      color: colors.primaryDeep,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 999,
      fontSize: 13,
      overflow: 'hidden',
    },
    centerBox: { alignItems: 'center', marginTop: 48, gap: 12 },
    hint: { fontSize: 14, color: colors.secondary },
    message: { fontSize: 16, color: colors.ink, textAlign: 'center', lineHeight: 26 },
    retryBtn: {
      backgroundColor: colors.primary,
      borderRadius: 999,
      paddingHorizontal: 22,
      paddingVertical: 10,
    },
    retryText: { color: '#fff', fontSize: 14, fontWeight: '700' },
    card: {
      marginTop: 20,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: colors.radius,
      padding: 16,
      backgroundColor: colors.card,
    },
    backText: {
      marginTop: 20,
      fontSize: 14,
      fontWeight: '700',
      color: colors.primaryDeep,
    },
    eqTitle: { fontSize: 15, fontWeight: '700', color: colors.ink, marginTop: 20, marginBottom: 10 },
    eqRow: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      paddingVertical: 12,
      paddingHorizontal: 16,
      marginBottom: 10,
      backgroundColor: colors.card,
    },
    eqRowDisabled: { opacity: 0.45 },
    eqDe: { fontSize: 19, fontWeight: '700', color: colors.ink, writingDirection: 'ltr', textAlign: 'left' },
    eqFa: { fontSize: 13, color: colors.secondary, marginTop: 3 },
  });
}
