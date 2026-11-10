// پاپ‌آپ معنی کلمه — به سبک دیکشنریِ اپ‌های کتاب‌خوان: صفحه‌ی تیره از پایین باز می‌شود،
// کلمه وسط‌چین بالای یک خط، ردیف تلفظ، و فهرست معنی‌های فارسی خط‌به‌خط.
// روی کلمه‌های داخل تعریف‌ها و مثال‌ها هم می‌شود زد و همان‌جا معنی‌شان را دید (حفاری).
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useAudioPlayer } from 'expo-audio';
import * as Clipboard from 'expo-clipboard';

import { leitnerAdd, lookupGerman, ttsUrl, type Entry } from '@/lib/api';
import { logActivity } from '@/lib/storage';

import { TappableSentence } from './tappable-sentence';

const SENSE_SIZES = [15, 17, 19];
const ICON_COLOR = '#C9C9D1';

// ردیف تلفظ — پلیر جدا برای هر کلمه تا منبع صدا از اول روی همان کلمه ساخته شود
function PronunciationRow({ speak, ipa }: { speak: string; ipa: string | null }) {
  const player = useAudioPlayer({ uri: ttsUrl(speak) });

  const play = () => {
    try {
      player.seekTo(0);
      player.play();
    } catch {
      // پخش صدا نباید هیچ‌وقت اپ را خراب کند
    }
  };

  return (
    <View style={styles.pronRow}>
      <Pressable onPress={play} hitSlop={8}>
        <Text style={styles.pronSpeaker}>🔊</Text>
      </Pressable>
      <Text style={styles.pronText}>
        آلمانی: {ipa ? <Text style={styles.ipa}>/{ipa}/</Text> : speak}
      </Text>
    </View>
  );
}

export function WordPopup({
  word,
  onClose,
  onOpenFull,
}: {
  word: string | null;
  onClose: () => void;
  onOpenFull?: () => void;
}) {
  const [currentWord, setCurrentWord] = useState<string | null>(word);
  const [entry, setEntry] = useState<Entry | null>(null);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [senseSize, setSenseSize] = useState<number>(SENSE_SIZES[0]);
  const [showDetails, setShowDetails] = useState(true);
  const [copied, setCopied] = useState(false);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const scrollRef = useRef<any>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // هر بار که کلمه‌ی تازه‌ای از بیرون داده شد، از همان شروع کن
  useEffect(() => {
    setCurrentWord(word);
  }, [word]);

  useEffect(() => {
    if (!currentWord) {
      setEntry(null);
      setNotFound(false);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setEntry(null);
    setNotFound(false);
    setAdded(false);
    setCopied(false);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
    lookupGerman(currentWord)
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
  }, [currentWord]);

  useEffect(
    () => () => {
      if (copyTimer.current) clearTimeout(copyTimer.current);
    },
    [],
  );

  if (!word) return null;

  const drill = (w: string) => setCurrentWord(w);

  const cycleSenseSize = () => {
    setSenseSize((s) => {
      const i = SENSE_SIZES.indexOf(s);
      return SENSE_SIZES[(i + 1) % SENSE_SIZES.length];
    });
  };

  const copyEntry = async () => {
    if (!entry) return;
    try {
      await Clipboard.setStringAsync(`${entry.speak} — ${entry.persian ?? ''}`);
      setCopied(true);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 1200);
    } catch {
      // کپی نباید پاپ‌آپ را خراب کند
    }
  };

  const addToLeitner = async () => {
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

  const senses = entry?.persian
    ? entry.persian
        .split(/[،,؛;]/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
    : [];

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheet}>
          {/* نوار ابزار: چپ ⚙ اندازه‌ی فونت معنی‌ها — راست: جزئیات، مدخل کامل، کپی، لایتنر، بستن */}
          <View style={styles.toolbar}>
            <Pressable onPress={cycleSenseSize} hitSlop={8}>
              <Text style={styles.toolIcon}>⚙</Text>
            </Pressable>
            <View style={styles.toolGroup}>
              <Pressable onPress={() => setShowDetails((v) => !v)} hitSlop={8}>
                <Text style={[styles.toolIcon, !showDetails && styles.toolIconOff]}>📄</Text>
              </Pressable>
              {onOpenFull ? (
                <Pressable onPress={onOpenFull} hitSlop={8}>
                  <Text style={styles.toolIcon}>🔍</Text>
                </Pressable>
              ) : null}
              <Pressable onPress={copyEntry} disabled={!entry} hitSlop={8}>
                <Text style={[styles.toolIcon, !entry && styles.toolIconOff]}>
                  {copied ? '✓' : '📋'}
                </Text>
              </Pressable>
              <Pressable onPress={addToLeitner} disabled={!entry || adding || added} hitSlop={8}>
                <Text style={[styles.toolIcon, (!entry || added) && styles.toolIconOff]}>
                  {added ? '✅' : '💾'}
                </Text>
              </Pressable>
              <Pressable onPress={onClose} hitSlop={8}>
                <Text style={styles.toolIcon}>✕</Text>
              </Pressable>
            </View>
          </View>

          <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false}>
            {loading ? (
              <View style={styles.center}>
                <ActivityIndicator color="#fff" size="large" />
                <Text style={styles.loadingText}>…</Text>
              </View>
            ) : notFound || !entry ? (
              <View style={styles.center}>
                <Text style={styles.notFound}>😕 «{currentWord}» پیدا نشد</Text>
                <Text style={styles.notFoundHint}>
                  بعضی شکل‌های صرف‌شده‌ی کلمه‌ها مدخلِ دیکشنری نیستند؛ شکلِ پایه‌اش را امتحان کن.
                </Text>
              </View>
            ) : (
              <>
                {/* کلمه وسط‌چین بالای خط، با نشانه‌ی کوچک دیکشنری در سرِ خط */}
                <Text style={styles.headword}>{entry.speak}</Text>
                <View style={styles.ruleRow}>
                  <Text style={styles.ruleIcon}>📖</Text>
                  <View style={styles.ruleLine} />
                </View>

                <PronunciationRow
                  key={entry.speak}
                  speak={entry.speak}
                  ipa={entry.ipa}
                />

                {/* معنی‌های فارسی، هر معنی یک خط */}
                <View style={styles.senses}>
                  {(senses.length > 0 ? senses : ['—']).map((s, i, arr) => (
                    <Text
                      key={i}
                      style={[
                        styles.sense,
                        { fontSize: senseSize },
                        i === arr.length - 1 && styles.senseLast,
                      ]}>
                      {s}
                    </Text>
                  ))}
                </View>

                {showDetails ? (
                  <View style={styles.details}>
                    {entry.definitions.length > 0 ? (
                      <>
                        <Text style={styles.detailsLabel}>تعریف آلمانی</Text>
                        {entry.definitions.slice(0, 3).map((d, i) => (
                          <View key={i} style={styles.defRow}>
                            <Text style={styles.defNum}>{i + 1}.</Text>
                            <View style={styles.defBody}>
                              <TappableSentence
                                text={d}
                                onWord={drill}
                                wordColor="#AFA3FF"
                                bullet={false}
                                style={styles.defText}
                              />
                            </View>
                          </View>
                        ))}
                      </>
                    ) : null}

                    {entry.examples.slice(0, 2).map((ex, i) => (
                      <View key={i} style={styles.exRow}>
                        <TappableSentence
                          text={ex}
                          onWord={drill}
                          wordColor="#AFA3FF"
                          bullet
                          style={styles.exText}
                        />
                      </View>
                    ))}
                  </View>
                ) : null}
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
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    backgroundColor: '#2B2B30',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 20,
    maxHeight: '78%',
  },
  toolbar: {
    direction: 'ltr',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    marginBottom: 6,
  },
  toolGroup: { direction: 'ltr', flexDirection: 'row', alignItems: 'center', gap: 18 },
  toolIcon: { fontSize: 19, color: ICON_COLOR },
  toolIconOff: { opacity: 0.35 },
  center: { alignItems: 'center', paddingVertical: 30, gap: 12 },
  loadingText: { fontSize: 16, color: ICON_COLOR },
  notFound: { fontSize: 16, color: '#fff', textAlign: 'center' },
  notFoundHint: { fontSize: 13, lineHeight: 20, color: '#9A9AA3', textAlign: 'center' },
  headword: {
    fontSize: 21,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    writingDirection: 'ltr',
    marginTop: 4,
  },
  ruleRow: {
    direction: 'ltr',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  ruleIcon: { fontSize: 13, color: ICON_COLOR },
  ruleLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.25)' },
  pronRow: {
    direction: 'ltr',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  pronSpeaker: { fontSize: 17 },
  pronText: { fontSize: 14.5, color: '#D8D8DE' },
  ipa: { writingDirection: 'ltr' },
  senses: { marginTop: 8 },
  sense: {
    color: '#fff',
    lineHeight: 26,
    textAlign: 'right',
    paddingVertical: 7,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.07)',
  },
  senseLast: { borderBottomWidth: 0 },
  details: { marginTop: 14 },
  detailsLabel: { fontSize: 12, color: '#9A9AA3', marginBottom: 6 },
  defRow: { direction: 'ltr', flexDirection: 'row', gap: 6, marginTop: 4 },
  defNum: { fontSize: 14.5, lineHeight: 22, color: '#9A9AA3', writingDirection: 'ltr' },
  defBody: { flex: 1 },
  defText: { color: '#EDEDF2', fontSize: 14.5, lineHeight: 22 },
  exRow: { marginTop: 8 },
  exText: { color: '#EDEDF2', fontSize: 14, lineHeight: 22 },
});
