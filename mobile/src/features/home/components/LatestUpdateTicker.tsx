import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Easing, StyleSheet, Text, View } from "react-native";
import { theme } from "@/theme";

export function LatestUpdateTicker({ enabled, text }: { enabled?: boolean; text?: string }) {
  const message = text?.trim() ?? "";
  const translateX = useRef(new Animated.Value(0)).current;
  const animation = useRef<Animated.CompositeAnimation | null>(null);
  const restartTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
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
    if (restartTimer.current) clearTimeout(restartTimer.current);
    restartTimer.current = null;
    if (!enabled || !message || reduceMotion || !containerWidth || !textWidth) {
      translateX.setValue(0);
      return;
    }
    const distance = containerWidth + textWidth;
    let cancelled = false;
    const runPass = () => {
      if (cancelled) return;
      translateX.setValue(containerWidth);
      animation.current = Animated.timing(translateX, {
        toValue: -textWidth,
        duration: Math.max(4_000, distance * 20),
        easing: Easing.linear,
        useNativeDriver: true,
      });
      animation.current.start(({ finished }) => {
        if (!finished || cancelled) return;
        restartTimer.current = setTimeout(runPass, 500);
      });
    };
    runPass();
    return () => { cancelled = true; animation.current?.stop(); if (restartTimer.current) clearTimeout(restartTimer.current); restartTimer.current = null; };
  }, [containerWidth, enabled, message, reduceMotion, textWidth, translateX]);

  if (!enabled || !message) return null;
  return <View accessibilityRole="text" accessibilityLabel={`Latest update: ${message}`} style={styles.card}>
    <View style={styles.label}><Text style={styles.icon}>📢</Text><Text style={styles.labelText}>Latest Update</Text></View>
    <View onLayout={(event) => setContainerWidth(event.nativeEvent.layout.width)} style={styles.track}>
      {reduceMotion ? <Text style={styles.staticText}>{message}</Text> : <><View pointerEvents="none" style={styles.measure}><Text onTextLayout={(event) => setTextWidth(Math.ceil(Math.max(...event.nativeEvent.lines.map((line) => line.width), 0)) + 4)} style={styles.measureText}>{message}</Text></View>{textWidth ? <Animated.Text style={[styles.message, { width: textWidth, flexShrink: 0, transform: [{ translateX }] }]}>{message}</Animated.Text> : <Text style={styles.loadingText}>{message}</Text>}</>}
    </View>
  </View>;
}

const styles = StyleSheet.create({
  card: { minHeight: 48, marginTop: 16, flexDirection: "row", alignItems: "stretch", overflow: "hidden", borderWidth: 1, borderColor: "#A7F3D0", borderRadius: 14, backgroundColor: "#ECFDF5" },
  label: { minHeight: 48, flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, backgroundColor: theme.colors.primary },
  icon: { fontSize: 15 },
  labelText: { color: "white", fontSize: 11, fontWeight: "900" },
  track: { minHeight: 48, flex: 1, justifyContent: "center", overflow: "hidden" },
  measure: { position: "absolute", left: -10_000, width: 10_000, opacity: 0.01 },
  measureText: { alignSelf: "flex-start", color: theme.colors.text, fontSize: 13, lineHeight: 18, fontWeight: "600" },
  message: { position: "absolute", top: 15, color: theme.colors.text, fontSize: 13, lineHeight: 18, fontWeight: "600" },
  loadingText: { paddingHorizontal: 10, color: theme.colors.text, fontSize: 13, lineHeight: 18, fontWeight: "600" },
  staticText: { paddingHorizontal: 10, paddingVertical: 8, color: theme.colors.text, fontSize: 13, lineHeight: 18, fontWeight: "600" },
});
