// تمرین تلفظ: صدای نمونه (TTS، عادی و آهسته) را گوش بده، صدای خودت را ضبط کن
// (expo-audio) و کنار هم پخش کن. امتیاز خودکار نداریم — ارزیابی بدون بک‌اند
// تشخیص گفتار قابل‌اعتماد نیست؛ پس فقط ضبط، پخش کنار هم و خودارزیابی.
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, Pressable, Text, TextInput, View } from 'react-native';

import clozeData from '../../assets/data/cloze-sentences.json';

import { ScreenScroll } from '@/components/screen';
import { BackRow, Segment, useTrainingStyles } from '@/components/training-ui';
import { ttsUrl } from '@/lib/api';
import { CEFR_LEVELS, wordsOfLevel } from '@/lib/local-dict';
import { logActivity } from '@/lib/storage';
import { useAppTheme } from '@/lib/theme-context';
import { faNum, shuffle } from '@/lib/training';

type Source = 'word' | 'sentence' | 'custom';
type Item = { de: string; fa: string };
const MAX_SECONDS = 15;

function randomWord(): Item {
  const pool = CEFR_LEVELS.flatMap((l) => wordsOfLevel(l));
  const w = shuffle(pool)[0];
  return w ? { de: `${w.article ? w.article + ' ' : ''}${w.word}`, fa: w.fa } : { de: 'Hallo', fa: 'سلام' };
}

function randomSentence(): Item {
  const short = (clozeData as { de: string; fa: string }[]).filter((s) => s.de.length <= 60);
  const s = shuffle(short)[0];
  return s ? { de: s.de, fa: s.fa } : { de: 'Wie geht es dir?', fa: 'حالت چطور است؟' };
}

/** آیا این مرورگر/دستگاه اصلاً امکان ضبط دارد؟ (روی وب: getUserMedia + اتصال امن) */
function webMicSupport(): boolean {
  if (Platform.OS !== 'web') return true;
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  return !!navigator.mediaDevices?.getUserMedia && window.isSecureContext !== false && typeof MediaRecorder !== 'undefined';
}

// پخش‌کننده و ضبط‌کننده‌ی expo-audio در رندر ایستای وب (Node) در دسترس نیستند؛
// پس بخش اصلی فقط بعد از mount روی دستگاه/مرورگر ساخته می‌شود.
export default function PronunciationScreen() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  if (!mounted) {
    return (
      <ScreenScroll>
        <BackRow />
      </ScreenScroll>
    );
  }
  return <PronunciationTrainer />;
}

function PronunciationTrainer() {
  const { colors, isDark } = useAppTheme();
  const t = useTrainingStyles();

  const [source, setSource] = useState<Source>('word');
  const [item, setItem] = useState<Item | null>(null);
  const [custom, setCustom] = useState('');
  const [micOk, setMicOk] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recUri, setRecUri] = useState<string | null>(null);
  const [rated, setRated] = useState<'good' | 'again' | null>(null);
  const [tries, setTries] = useState(0);

  // آیتم اول بعد از mount ساخته می‌شود تا HTML ایستای وب با کلاینت یکی بماند
  useEffect(() => {
    setItem(randomWord());
    setMicOk(webMicSupport());
  }, []);

  const text = (source === 'custom' ? custom.trim() : item?.de ?? '').slice(0, 300);

  const modelPlayer = useAudioPlayer(text ? { uri: ttsUrl(text) } : null);
  const slowPlayer = useAudioPlayer(text ? { uri: ttsUrl(text, true) } : null);
  const minePlayer = useAudioPlayer(recUri ? { uri: recUri } : null);
  const modelStatus = useAudioPlayerStatus(modelPlayer);

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recState = useAudioRecorderState(recorder, 250);
  const recording = recState.isRecording;
  const stopTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sequence = useRef(false);

  const play = (p: typeof modelPlayer) => {
    try {
      p.seekTo(0);
      p.play();
    } catch {
      // پخش صدا نباید هیچ‌وقت اپ را خراب کند
    }
  };

  // «پشت‌سرهم»: بعد از تمام شدن نمونه، ضبط خودت پخش می‌شود
  useEffect(() => {
    if (sequence.current && modelStatus.didJustFinish) {
      sequence.current = false;
      if (recUri) play(minePlayer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelStatus.didJustFinish]);

  const resetForNew = () => {
    setRecUri(null);
    setRated(null);
    setError(null);
  };

  const nextItem = (s: Source = source) => {
    resetForNew();
    if (s === 'word') setItem(randomWord());
    else if (s === 'sentence') setItem(randomSentence());
  };

  const stop = useCallback(async () => {
    if (stopTimer.current) {
      clearTimeout(stopTimer.current);
      stopTimer.current = null;
    }
    try {
      await recorder.stop();
      setRecUri(recorder.uri ?? null);
      setTries((n) => n + 1);
      setRated(null);
    } catch {
      setError('ضبط درست تمام نشد. دوباره امتحان کن.');
    } finally {
      // برگرداندن صدای پخش به بلندگو (iOS در حالت ضبط صدا را به گوشی می‌برد)
      setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => {});
    }
  }, [recorder]);

  const start = async () => {
    setError(null);
    if (!webMicSupport()) {
      setMicOk(false);
      return;
    }
    try {
      const perm = await requestRecordingPermissionsAsync();
      if (!perm.granted) {
        setError(
          Platform.OS === 'web'
            ? 'اجازه‌ی میکروفون داده نشد. از نوار آدرس مرورگر دسترسی میکروفون را برای این سایت روشن کن.'
            : 'اجازه‌ی میکروفون داده نشد. از تنظیمات گوشی، دسترسی میکروفون را برای 33Bayan روشن کن.',
        );
        return;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      setRecUri(null);
      stopTimer.current = setTimeout(() => {
        stop();
      }, MAX_SECONDS * 1000);
    } catch {
      setError(
        Platform.OS === 'web'
          ? 'میکروفون در این مرورگر در دسترس نیست (میکروفونی وصل است؟).'
          : 'ضبط شروع نشد. میکروفون را چک کن و دوباره امتحان کن.',
      );
      setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => {});
    }
  };

  // ترک صفحه وسط ضبط
  useEffect(
    () => () => {
      if (stopTimer.current) clearTimeout(stopTimer.current);
    },
    [],
  );

  const rate = (r: 'good' | 'again') => {
    if (rated) return;
    setRated(r);
    logActivity('review').catch(() => {});
  };

  const recSeconds = Math.floor((recState.durationMillis || 0) / 1000);

  return (
    <ScreenScroll keyboardShouldPersistTaps="handled">
      <BackRow />
      <Text style={t.title}>🎙️ تمرین تلفظ</Text>
      <Text style={t.subtitle}>گوش بده، صدای خودت را ضبط کن و دو صدا را کنار هم مقایسه کن.</Text>

      <Segment
        options={[
          { value: 'word', label: 'کلمه' },
          { value: 'sentence', label: 'جمله' },
          { value: 'custom', label: 'متن دلخواه' },
        ]}
        value={source}
        onChange={(s) => {
          setSource(s);
          nextItem(s);
        }}
      />

      {source === 'custom' ? (
        <TextInput
          style={t.input}
          value={custom}
          onChangeText={(v) => {
            setCustom(v);
            resetForNew();
          }}
          placeholder="یک کلمه یا جمله‌ی آلمانی…"
          placeholderTextColor={colors.secondary}
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={300}
        />
      ) : item ? (
        <View style={[t.card, { alignItems: 'center' }]}>
          <Text style={[t.word, source === 'sentence' && { fontSize: 22, lineHeight: 34 }]} selectable>
            {item.de}
          </Text>
          <Text style={t.persian}>{item.fa}</Text>
        </View>
      ) : null}

      {text ? (
        <>
          <Text style={t.sectionHeader}>۱. گوش بده</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Pressable onPress={() => play(modelPlayer)} style={[t.secondaryBtn, { flex: 1, marginTop: 0 }]}>
              <Text style={t.secondaryBtnText}>🔊 صدای نمونه</Text>
            </Pressable>
            <Pressable onPress={() => play(slowPlayer)} style={[t.secondaryBtn, { flex: 1, marginTop: 0 }]}>
              <Text style={t.secondaryBtnText}>🐢 آهسته</Text>
            </Pressable>
          </View>

          <Text style={t.sectionHeader}>۲. ضبط کن</Text>
          {!micOk ? (
            <View style={t.feedbackBad}>
              <Text style={t.feedbackText}>
                🎙️ ضبط صدا در این مرورگر در دسترس نیست (به اتصال امن HTTPS و مرورگری با پشتیبانی
                میکروفون نیاز است). می‌توانی صدای نمونه را گوش بدهی و بلند تکرار کنی، یا از اپ
                اندروید استفاده کنی.
              </Text>
            </View>
          ) : (
            <Pressable
              onPress={recording ? stop : start}
              style={[
                t.primaryBtn,
                { marginTop: 0, paddingVertical: 16 },
                recording && { backgroundColor: colors.danger },
              ]}>
              <Text style={t.primaryBtnText}>
                {recording
                  ? `⏹️ توقف ضبط (${faNum(recSeconds)} ثانیه)`
                  : recUri
                    ? '🎙️ ضبط دوباره'
                    : '🎙️ شروع ضبط'}
              </Text>
            </Pressable>
          )}
          {recording ? (
            <Text style={t.note}>حداکثر {faNum(MAX_SECONDS)} ثانیه — حالا بلند بخوان.</Text>
          ) : null}
          {error ? (
            <View style={t.feedbackBad}>
              <Text style={t.feedbackText}>⚠️ {error}</Text>
            </View>
          ) : null}

          {recUri && !recording ? (
            <>
              <Text style={t.sectionHeader}>۳. مقایسه کن</Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={[t.card, { flex: 1, alignItems: 'center', padding: 14 }]}>
                  <Text style={t.progress}>نمونه</Text>
                  <Pressable onPress={() => play(modelPlayer)} style={[t.primaryBtn, { marginTop: 0, alignSelf: 'stretch' }]}>
                    <Text style={t.primaryBtnText}>▶️ پخش</Text>
                  </Pressable>
                </View>
                <View
                  style={[
                    t.card,
                    { flex: 1, alignItems: 'center', padding: 14, backgroundColor: isDark ? colors.chip : colors.soft },
                  ]}>
                  <Text style={t.progress}>صدای من</Text>
                  <Pressable onPress={() => play(minePlayer)} style={[t.primaryBtn, { marginTop: 0, alignSelf: 'stretch', backgroundColor: colors.success }]}>
                    <Text style={t.primaryBtnText}>▶️ پخش</Text>
                  </Pressable>
                </View>
              </View>
              <Pressable
                onPress={() => {
                  sequence.current = true;
                  play(modelPlayer);
                }}
                style={t.secondaryBtn}>
                <Text style={t.secondaryBtnText}>🔁 پشت‌سرهم: نمونه، بعد صدای من</Text>
              </Pressable>

              <Text style={[t.progress, { marginTop: 16, textAlign: 'center' }]}>خودت قضاوت کن:</Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Pressable
                  onPress={() => rate('good')}
                  style={[t.secondaryBtn, { flex: 1, marginTop: 0 }, rated === 'good' && { backgroundColor: colors.success }]}>
                  <Text style={[t.secondaryBtnText, rated === 'good' && { color: '#fff' }]}>👍 شبیه بود</Text>
                </Pressable>
                <Pressable
                  onPress={() => rate('again')}
                  style={[t.secondaryBtn, { flex: 1, marginTop: 0 }, rated === 'again' && { backgroundColor: colors.danger }]}>
                  <Text style={[t.secondaryBtnText, rated === 'again' && { color: '#fff' }]}>🔁 باید تمرین کنم</Text>
                </Pressable>
              </View>
            </>
          ) : null}

          {source !== 'custom' ? (
            <Pressable onPress={() => nextItem()} style={t.primaryBtn} disabled={recording}>
              <Text style={t.primaryBtnText}>🎲 {source === 'word' ? 'کلمه' : 'جمله'}ی بعدی</Text>
            </Pressable>
          ) : null}
        </>
      ) : null}

      <Text style={[t.note, { marginTop: 20 }]}>
        امتیاز خودکار تلفظ فعلاً نداریم؛ مقایسه‌ی گوشی دو صدا بهترین راه است.
        {tries ? ` تا حالا ${faNum(tries)} بار ضبط کردی.` : ''} ضبط‌ها فقط روی دستگاه خودت
        می‌مانند و جایی فرستاده نمی‌شوند.
      </Text>
    </ScreenScroll>
  );
}
