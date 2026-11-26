// پوسته‌ی مشترک همه‌ی صفحه‌ها: فاصله‌ی امن از بالای صفحه (زیر نوار وضعیت)
// و محدود کردن عرض محتوا روی صفحه‌های پهن (تبلت) تا لبه‌به‌لبه کشیده نشود.
// همچنین وقتی کیبورد باز می‌شود، ته صفحه به اندازه‌ی کیبورد فضا می‌گیرد و
// فیلدِ فعال خودکار بالای کیبورد اسکرول می‌شود (اندروید edge-to-edge خودش resize نمی‌کند).
import { useEffect, useRef, useState, type ComponentRef, type ReactNode } from "react";
import { Image } from "expo-image";
import {
  Keyboard,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollViewProps,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useLayoutSize } from "@/hooks/use-layout";
import { useAppTheme } from "@/lib/theme-context";

/** ارتفاع کیبورد و جابه‌جا کردن فیلد فعال به بالای آن */
function useKeyboardAware() {
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const scrollY = useRef(0);
  const [kbHeight, setKbHeight] = useState(0);

  useEffect(() => {
    if (Platform.OS === "web") return;
    const showEvt = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvt = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const show = Keyboard.addListener(showEvt, (e) => {
      const h = e.endCoordinates.height;
      const kbTop = e.endCoordinates.screenY;
      setKbHeight(h);
      // بعد از اعمال فضای اضافه، فیلد فعال را بالای کیبورد بیاور
      setTimeout(() => {
        const input = TextInput.State.currentlyFocusedInput?.() as
          | { measureInWindow?: (cb: (x: number, y: number, w: number, h: number) => void) => void }
          | null;
        input?.measureInWindow?.((_x, y, _w, fh) => {
          const overlap = y + fh + 24 - kbTop;
          if (overlap > 0) {
            scrollRef.current?.scrollTo({ y: scrollY.current + overlap, animated: true });
          }
        });
      }, 80);
    });
    const hide = Keyboard.addListener(hideEvt, () => setKbHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollY.current = e.nativeEvent.contentOffset.y;
  };
  return { scrollRef, kbHeight, onScroll };
}

export function ScreenScroll({
  children,
  contentContainerStyle,
  onScroll: userOnScroll,
  ...props
}: ScrollViewProps & { children: ReactNode }) {
  const { colors, isDark } = useAppTheme();
  const size = useLayoutSize();
  const maxWidth = size === "expanded" ? 1120 : size === "medium" ? 920 : 760;
  const { scrollRef, kbHeight, onScroll } = useKeyboardAware();
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {isDark ? (
        // پس‌زمینه‌ی تم تیره: «برلین در شب» (آسمان بنفش، ستاره‌ها، خط افق برلین)
        <Image
          source={require("@/assets/images/bg-dark-berlin.jpg")}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          pointerEvents="none"
        />
      ) : null}
      <SafeAreaView
        style={{ flex: 1, backgroundColor: "transparent" }}
        edges={["top"]}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="none"
          {...props}
          ref={scrollRef}
          scrollEventThrottle={16}
          onScroll={(e) => {
            onScroll(e);
            userOnScroll?.(e);
          }}
          contentContainerStyle={[
            {
              padding: 20,
              paddingBottom: 28,
              width: "100%",
              maxWidth,
              paddingHorizontal: size === "compact" ? 20 : 32,
              alignSelf: "center",
              flexGrow: 1,
            },
            contentContainerStyle,
            kbHeight > 0 ? { paddingBottom: 28 + kbHeight } : null,
          ]}
        >
          {children}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
