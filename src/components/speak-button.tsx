// دکمه‌های تلفظ — صدا از همان endpoint ربات پخش می‌شود (Google TTS)
import { useAudioPlayer } from 'expo-audio';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ttsUrl } from '@/lib/api';
import { Brand } from '@/constants/theme';

export function SpeakButtons({ text, light = false }: { text: string; light?: boolean }) {
  const player = useAudioPlayer();

  const play = (slow: boolean) => {
    try {
      player.replace({ uri: ttsUrl(text, slow) });
      player.play();
    } catch {
      // پخش صدا نباید هیچ‌وقت اپ را خراب کند
    }
  };

  return (
    <View style={styles.row}>
      <Pressable onPress={() => play(false)} style={[styles.btn, light && styles.btnLight]}>
        <Text style={[styles.btnText, light && styles.btnTextLight]}>🔊 تلفظ</Text>
      </Pressable>
      <Pressable onPress={() => play(true)} style={[styles.btn, light && styles.btnLight]}>
        <Text style={[styles.btnText, light && styles.btnTextLight]}>🐌 آهسته</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
  btn: {
    backgroundColor: Brand.chip,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  btnLight: { backgroundColor: 'rgba(255,255,255,0.25)' },
  btnText: { color: Brand.primaryDeep, fontSize: 13, fontWeight: '600' },
  btnTextLight: { color: '#fff' },
});
