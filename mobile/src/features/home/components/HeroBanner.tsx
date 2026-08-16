import { Image } from "expo-image";
import { useEffect, useState } from "react";
import { Link } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { SiteSettings } from "@/types/domain";
import { theme } from "@/theme";
import { IMAGE_BLURHASH, resolveImageUrl } from "@/utils/images";

export function HeroBanner({ settings, loading }: { settings?: SiteSettings | null; loading: boolean }) {
  const [imageFailed, setImageFailed] = useState(false);
  useEffect(() => setImageFailed(false), [settings?.heroBannerUrl]);
  const image = imageFailed ? null : resolveImageUrl(settings?.heroBannerUrl, 900);
  if (image) return <View style={styles.hero}><Image source={image} placeholder={{ blurhash: IMAGE_BLURHASH }} cachePolicy="memory-disk" contentFit="cover" transition={200} style={StyleSheet.absoluteFill} accessibilityLabel="Construction materials banner" onError={() => setImageFailed(true)} /></View>;
  return <View style={styles.hero}><View style={styles.content}><Text style={styles.eyebrow}>BUILD WITH CONFIDENCE</Text><Text style={styles.title}>{settings?.heroTitle || "घर बनाने का सामान, एक ही जगह"}</Text><Text style={styles.subtitle}>{settings?.heroSubtitle || "Cement • Steel • Roofing • Construction Materials"}</Text><Link href="/(tabs)/products" asChild><Pressable accessibilityRole="button" style={({ pressed }) => [styles.cta, pressed && { opacity: 0.8 }]}><Text style={styles.ctaText}>Browse Products</Text><Text style={styles.ctaArrow}>→</Text></Pressable></Link>{loading ? <Text style={styles.connecting}>Connecting to business services…</Text> : null}</View></View>;
}
const styles = StyleSheet.create({ hero: { minHeight: 248, marginTop: 18, overflow: "hidden", borderRadius: 22, backgroundColor: theme.colors.primaryDark }, content: { flex: 1, minHeight: 248, justifyContent: "center", padding: 22 }, eyebrow: { color: "#99F6E4", fontSize: 11, fontWeight: "900", letterSpacing: 1.2 }, title: { maxWidth: 310, marginTop: 9, color: "white", fontSize: 28, lineHeight: 35, fontWeight: "900" }, subtitle: { maxWidth: 300, marginTop: 9, color: "#D5F5F0", fontSize: 14, lineHeight: 20 }, cta: { minHeight: 46, marginTop: 20, alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 9, paddingHorizontal: 16, borderRadius: 12, backgroundColor: theme.colors.secondary }, ctaText: { color: theme.colors.text, fontWeight: "900" }, ctaArrow: { color: theme.colors.text, fontSize: 18, fontWeight: "900" }, connecting: { marginTop: 12, color: "#CCFBF1", fontSize: 11 } });
