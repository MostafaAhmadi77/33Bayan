// پاپ‌آپ معنی کلمه — وقتی کاربر روی یک کلمه از جمله‌های مثال می‌زند باز می‌شود
// (مثل دیکشنریِ اپ‌های کتاب‌خوان): معنی فارسی، چند تعریف، تلفظ و افزودن به لایتنر
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Brand } from '@/constants/theme';
import { leitnerAdd, lookupGerman, type Entry } from '@/lib/api';
import { logActivity } from '@/lib/storage';

import { SpeakButtons } from './speak-button';

export function WordPopup({ word, onClose }: { word: string | null; onClose: () => void }) {
  const [entry, setEntry] = useState<Entry | null>(null);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (!word) {
      setEntry(null);
      setNotFound(false);
      setLoading(false);
      setAdded(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setEntry(null);
    setNotFound(false);
    setAdded(false);
    lookupGerman(word)
      .then((r) => {
        if (cancelled) return;
        if (r.found && r.entry) setEntry(r.entry);
        else setNotFound(true);
      })
      .catch(() => {
        if (!cancelled) setNotFound(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [word]);

  if (!word) return null;

  const add = async () => {
    if (!entry || adding || added) return;
    setAdding(true);
    try {
      await leitnerAdd(entry, 1);
      await logActivity('add');
      setAdded(true);
    } catch {
      // خطا در افزودن نباید پاپ‌آپ را خراب کند
    } finally {
      setAdding(false);
    }
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <ScrollView showsVerticalScrollIndicator={false}>
            {loading ? (
              <View style={styles.center}>
                <ActivityIndicator color={Brand.primary} size="large" />
                <Text style={styles.hint}>دارم پیداش می‌کنم…</Text>
              </View>
            ) : notFound || !entry ? (
              <View style={styles.center}>
                <Text style={styles.notFound}>😕 معنی «{word}» پیدا نشد</Text>
                <Pressable onPress={onClose} style={styles.closeBtn}>
                  <Text style={styles.closeBtnText}>بستن</Text>
                </Pressable>
              </View>
            ) : (
              <>
                <View style={styles.headRow}>
                  <Text style={styles.headword}>{entry.speak}</Text>
                  {entry.ipa ? <Text style={styles.ipa}>/{entry.ipa}/</Text> : null}
                </View>

                {entry.persian ? <Text style={styles.persian}>{entry.persian}</Text> : null}

                {entry.definitions.slice(0, 2).map((d, i) => (
                  <Text key={i} style={[styles.line, styles.ltr]}>
                    {i + 1}. {d}
                  </Text>
                ))}

                <View style={{ marginTop: 12 }}>
                  <SpeakButtons text={entry.speak} />
                </View>

                <View style={styles.btnRow}>
                  <Pressable
                    onPress={add}
                    disabled={added || adding}
                    style={[styles.addBtn, (added || adding) && { opacity: 0.65 }]}>
                    <Text style={styles.addBtnText}>
                      {added ? '✅ اضافه شد' : adding ? '…' : '📦 افزودن به لایتنر'}
                    </Text>
                  </Pressable>
                  <Pressable onPress={onClose} style={styles.closeBtn}>
                    <Text style={styles.closeBtnText}>بستن</Text>
                  </Pressable>
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(20,16,60,0.45)' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingTop: 12,
    maxHeight: '75%',
  },
  handle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#DDD9F2',
    alignSelf: 'center',
    marginBottom: 14,
  },
  center: { alignItems: 'center', paddingVertical: 28, gap: 14 },
  hint: { fontSize: 14, color: Brand.secondary },
  notFound: { fontSize: 16, color: Brand.ink, textAlign: 'center' },
  headRow: { flexDirection: 'row', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' },
  headword: { fontSize: 26, fontWeight: '800', color: Brand.ink, writingDirection: 'ltr' },
  ipa: { fontSize: 14, color: Brand.secondary, writingDirection: 'ltr' },
  persian: { fontSize: 20, fontWeight: '700', color: Brand.primaryDeep, marginTop: 10 },
  line: { fontSize: 15, lineHeight: 24, color: '#3D3D5C', marginTop: 4 },
  ltr: { writingDirection: 'ltr', textAlign: 'left' },
  btnRow: { flexDirection: 'row', gap: 10, marginTop: 18 },
  addBtn: {
    flex: 1,
    backgroundColor: Brand.primary,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  addBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  closeBtn: {
    backgroundColor: Brand.soft,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 22,
    alignItems: 'center',
  },
  closeBtnText: { color: Brand.ink, fontSize: 15, fontWeight: '600' },
});
