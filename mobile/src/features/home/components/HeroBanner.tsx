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
  return <View style={styles.hero}>{image ? <Image source={image} placeholder={{ blurhash: IMAGE_BLURHASH }} cachePolicy="memory-disk" contentFit="cover" transition={200} style={styles.decorativeImage} accessibilityLabel="Construction materials banner" onError={() => setImageFailed(true)} /> : null}<View style={styles.content}><Text style={styles.eyebrow}>BUILD WITH CONFIDENCE</Text><Text style={styles.title}>Quality Construction Materials</Text><Text style={styles.subtitle}>{settings?.heroSubtitle || "ACC Cement, Nuvoco Cement, Tata & Mongia steel rods, roofing sheets, waterproofing chemicals and more — at the best prices."}</Text><Link href="/(tabs)/products" asChild><Pressable accessibilityRole="button" style={({ pressed }) => [styles.cta, pressed && { opacity: 0.8 }]}><Text style={styles.ctaText}>Browse Products</Text><Text style={styles.ctaArrow}>→</Text></Pressable></Link>{loading ? <Text style={styles.connecting}>Connecting to business services…</Text> : null}</View></View>;
}
const styles = StyleSheet.create({ hero: { minHeight: 248, marginTop: 18, overflow: "hidden", borderRadius: 22, backgroundColor: theme.colors.primaryDark }, decorativeImage: { position: "absolute", right: 0, bottom: 0, width: "42%", height: "48%", opacity: 0.92 }, content: { flex: 1, minHeight: 248, justifyContent: "center", padding: 22, paddingRight: "40%" }, eyebrow: { color: "#99F6E4", fontSize: 11, fontWeight: "900", letterSpacing: 1.2 }, title: { marginTop: 9, color: "white", fontSize: 24, lineHeight: 29, fontWeight: "900" }, subtitle: { marginTop: 9, color: "#D5F5F0", fontSize: 12, lineHeight: 17 }, cta: { minHeight: 42, marginTop: 16, alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 9, paddingHorizontal: 14, borderRadius: 12, backgroundColor: theme.colors.secondary }, ctaText: { color: theme.colors.text, fontWeight: "900" }, ctaArrow: { color: theme.colors.text, fontSize: 18, fontWeight: "900" }, connecting: { marginTop: 12, color: "#CCFBF1", fontSize: 11 } });
