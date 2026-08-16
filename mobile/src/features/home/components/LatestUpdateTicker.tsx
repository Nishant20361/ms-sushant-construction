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

  useEffect(() => {
    animation.current?.stop();
    if (!enabled || !message || reduceMotion || !containerWidth || !textWidth) {
      translateX.setValue(0);
      return;
    }
    translateX.setValue(containerWidth);
    const distance = containerWidth + textWidth;
    animation.current = Animated.loop(Animated.timing(translateX, {
      toValue: -textWidth,
      duration: Math.max(7_000, distance * 24),
      easing: Easing.linear,
      useNativeDriver: true,
    }));
    animation.current.start();
    return () => animation.current?.stop();
  }, [containerWidth, enabled, message, reduceMotion, textWidth, translateX]);

  if (!enabled || !message) return null;
  return <View accessibilityRole="text" accessibilityLabel={`Latest update: ${message}`} style={styles.card}>
    <View style={styles.label}><Text style={styles.icon}>📢</Text><Text style={styles.labelText}>Latest Update</Text></View>
    <View onLayout={(event) => setContainerWidth(event.nativeEvent.layout.width)} style={styles.track}>
      {reduceMotion ? <Text numberOfLines={1} style={styles.staticText}>{message}</Text> : <Animated.Text onLayout={(event) => setTextWidth(event.nativeEvent.layout.width)} numberOfLines={1} style={[styles.message, { transform: [{ translateX }] }]}>{message}</Animated.Text>}
    </View>
  </View>;
}

const styles = StyleSheet.create({
  card: { minHeight: 48, marginTop: 16, flexDirection: "row", alignItems: "center", overflow: "hidden", borderWidth: 1, borderColor: "#A7F3D0", borderRadius: 14, backgroundColor: "#ECFDF5" },
  label: { minHeight: 48, flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, backgroundColor: theme.colors.primary },
  icon: { fontSize: 15 },
  labelText: { color: "white", fontSize: 11, fontWeight: "900" },
  track: { height: 22, flex: 1, justifyContent: "center", overflow: "hidden" },
  message: { position: "absolute", top: 2, color: theme.colors.text, fontSize: 13, lineHeight: 18, fontWeight: "600" },
  staticText: { paddingHorizontal: 10, color: theme.colors.text, fontSize: 13, fontWeight: "600" },
});
