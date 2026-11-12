// دکمه‌ی تلفظ — صدا از همان endpoint ربات پخش می‌شود (Google TTS)
import { useAudioPlayer } from 'expo-audio';
import { Pressable, StyleSheet, Text } from 'react-native';

import { ttsUrl } from '@/lib/api';
import { useAppTheme, type AppTheme } from '@/lib/theme-context';

export function SpeakButtons({ text, light = false }: { text: string; light?: boolean }) {
  const { colors } = useAppTheme();
  const styles = makeStyles(colors);
  const player = useAudioPlayer({ uri: ttsUrl(text) });

  const play = () => {
    try {
      player.seekTo(0);
      player.play();
    } catch {
      // پخش صدا نباید هیچ‌وقت اپ را خراب کند
    }
  };

  return (
    <Pressable onPress={play} style={[styles.btn, light && styles.btnLight]}>
      <Text style={[styles.btnText, light && styles.btnTextLight]}>🔊 تلفظ</Text>
    </Pressable>
  );
}

function makeStyles(colors: AppTheme['colors']) {
  return StyleSheet.create({
    btn: {
      backgroundColor: colors.chip,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 999,
      alignSelf: 'flex-start',
    },
    btnLight: { backgroundColor: 'rgba(255,255,255,0.25)' },
    btnText: { color: colors.primaryDeep, fontSize: 13, fontWeight: '600' },
    btnTextLight: { color: '#fff' },
  });
}
