import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Easing, StyleSheet, Text, View } from "react-native";
import { theme } from "@/theme";

export function LatestUpdateTicker({ enabled, text }: { enabled?: boolean; text?: string }) {
  const message = text?.trim() ?? "";
  const translateX = useRef(new Animated.Value(0)).current;
  const animation = useRef<Animated.CompositeAnimation | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [textWidth, setTextWidth] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion);
    return () => subscription.remove();
  }, []);

  useEffect(() => setTextWidth(0), [message]);

  useEffect(() => {
    animation.current?.stop();
    if (!enabled || !message || reduceMotion || !containerWidth) {
      translateX.setValue(0);
      return;
    }
    translateX.setValue(containerWidth);
    const distance = containerWidth + textWidth;
    animation.current = Animated.loop(Animated.sequence([
      Animated.timing(translateX, {
        toValue: -textWidth,
        duration: Math.max(5_000, distance * 22),
        easing: Easing.linear,
        useNativeDriver: true,
      }),
      Animated.delay(450),
    ]), { resetBeforeIteration: true });
    animation.current.start();
    return () => animation.current?.stop();
  }, [containerWidth, enabled, message, reduceMotion, textWidth, translateX]);

  if (!enabled || !message) return null;
  return <View accessibilityRole="text" accessibilityLabel={`Latest update: ${message}`} style={styles.card}>
    <View style={styles.label}><Text style={styles.icon}>📢</Text><Text style={styles.labelText}>Latest Update</Text></View>
    <View onLayout={(event) => setContainerWidth(event.nativeEvent.layout.width)} style={styles.track}>
      {reduceMotion ? <Text style={styles.staticText}>{message}</Text> : <><View pointerEvents="none" style={styles.measure}><Text numberOfLines={1} onTextLayout={(event) => setTextWidth(Math.ceil(event.nativeEvent.lines[0]?.width ?? 0) + 4)} style={styles.measureText}>{message}</Text></View>{textWidth ? <Animated.Text style={[styles.message, { width: textWidth, transform: [{ translateX }] }]}>{message}</Animated.Text> : null}</>}
    </View>
  </View>;
}

const styles = StyleSheet.create({
  card: { minHeight: 48, marginTop: 16, flexDirection: "row", alignItems: "stretch", overflow: "hidden", borderWidth: 1, borderColor: "#A7F3D0", borderRadius: 14, backgroundColor: "#ECFDF5" },
  label: { minHeight: 48, flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, backgroundColor: theme.colors.primary },
  icon: { fontSize: 15 },
  labelText: { color: "white", fontSize: 11, fontWeight: "900" },
  track: { minHeight: 48, flex: 1, justifyContent: "center", overflow: "hidden" },
  measure: { position: "absolute", width: 10_000, opacity: 0 },
  measureText: { alignSelf: "flex-start", color: theme.colors.text, fontSize: 13, lineHeight: 18, fontWeight: "600" },
  message: { position: "absolute", top: 15, color: theme.colors.text, fontSize: 13, lineHeight: 18, fontWeight: "600" },
  staticText: { paddingHorizontal: 10, paddingVertical: 8, color: theme.colors.text, fontSize: 13, lineHeight: 18, fontWeight: "600" },
});
