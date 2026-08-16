import { useEffect, useRef, useState } from "react";
import { Animated, Easing, ScrollView, StyleSheet, Text, View } from "react-native";
import { theme } from "@/theme";

const PIXELS_PER_SECOND = 50;
const RESTART_DELAY_MS = 500;
const MIN_DURATION_MS = 2_500;

export function LatestUpdateTicker({ enabled, text }: { enabled?: boolean; text?: string }) {
  const message = text?.trim() ?? "";
  const translateX = useRef(new Animated.Value(0)).current;
  const animation = useRef<Animated.CompositeAnimation | null>(null);
  const restartTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [textWidth, setTextWidth] = useState(0);

  useEffect(() => setTextWidth(0), [message]);

  useEffect(() => {
    animation.current?.stop();
    if (restartTimer.current) clearTimeout(restartTimer.current);
    restartTimer.current = null;
    if (!enabled || !message || viewportWidth <= 0 || textWidth <= 0) {
      translateX.setValue(0);
      return;
    }

    let cancelled = false;
    const distance = viewportWidth + textWidth;
    const duration = Math.max(MIN_DURATION_MS, Math.round((distance / PIXELS_PER_SECOND) * 1_000));
    const runPass = () => {
      if (cancelled) return;
      translateX.setValue(viewportWidth);
      animation.current = Animated.timing(translateX, {
        toValue: -textWidth,
        duration,
        easing: Easing.linear,
        useNativeDriver: true,
      });
      animation.current.start(({ finished }) => {
        if (!finished || cancelled) return;
        restartTimer.current = setTimeout(runPass, RESTART_DELAY_MS);
      });
    };
    runPass();
    return () => {
      cancelled = true;
      animation.current?.stop();
      if (restartTimer.current) clearTimeout(restartTimer.current);
      restartTimer.current = null;
    };
  }, [enabled, message, textWidth, translateX, viewportWidth]);

  if (!enabled || !message) return null;
  return <>
    <View accessibilityRole="text" accessibilityLabel={`Latest update: ${message}`} style={styles.card}>
      <View style={styles.label}><Text style={styles.icon}>📢</Text><Text style={styles.labelText}>Latest Update</Text></View>
      <View onLayout={(event) => setViewportWidth(Math.round(event.nativeEvent.layout.width))} style={styles.track}>
        {textWidth > 0 ? <Animated.Text numberOfLines={1} ellipsizeMode="clip" style={[styles.message, { width: textWidth, transform: [{ translateX }] }]}>{message}</Animated.Text> : null}
        <ScrollView horizontal scrollEnabled={false} pointerEvents="none" onContentSizeChange={(width) => { if (width > 0) setTextWidth(Math.ceil(width)); }} style={styles.measureViewport} contentContainerStyle={styles.measureContent}>
          <Text numberOfLines={1} ellipsizeMode="clip" style={styles.measureText}>{message}</Text>
        </ScrollView>
      </View>
    </View>
  </>;
}

const styles = StyleSheet.create({
  card: { minHeight: 48, marginTop: 16, flexDirection: "row", alignItems: "stretch", overflow: "hidden", borderWidth: 1, borderColor: "#A7F3D0", borderRadius: 14, backgroundColor: "#ECFDF5" },
  label: { minHeight: 48, flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, backgroundColor: theme.colors.primary },
  icon: { fontSize: 15 },
  labelText: { color: "white", fontSize: 11, fontWeight: "900" },
  track: { minHeight: 48, flex: 1, justifyContent: "center", overflow: "hidden" },
  message: { position: "absolute", top: 15, left: 0, flexShrink: 0, color: theme.colors.text, fontSize: 13, lineHeight: 18, fontWeight: "600" },
  measureViewport: { position: "absolute", top: 0, left: 0, right: 0, height: 1, opacity: 0 },
  measureContent: { alignItems: "flex-start" },
  measureText: { flexShrink: 0, color: theme.colors.text, fontSize: 13, lineHeight: 18, fontWeight: "600" },
});
