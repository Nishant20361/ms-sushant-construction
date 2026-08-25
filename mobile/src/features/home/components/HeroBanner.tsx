import { Image } from "expo-image";
import { useEffect, useState } from "react";
import { Link } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { SiteSettings } from "@/types/domain";
import { theme } from "@/theme";
import { IMAGE_BLURHASH, resolveImageUrl } from "@/utils/images";

export function HeroBanner({ settings, loading }: { settings?: SiteSettings | null; loading: boolean }) {
  const [imageFailed, setImageFailed] = useState(false);
  useEffect(() => setImageFailed(false), [settings?.mobileHeroBannerUrl]);
  const image = imageFailed ? null : resolveImageUrl(settings?.mobileHeroBannerUrl, 900);

  return (
    <View style={styles.hero}>
      {image ? (
        <Image
          source={image}
          placeholder={{ blurhash: IMAGE_BLURHASH }}
          cachePolicy="memory-disk"
          contentFit="cover"
          transition={200}
          style={styles.decorativeImage}
          accessibilityLabel="Construction materials banner"
          onError={() => setImageFailed(true)}
        />
      ) : null}
      <View style={styles.content}>
        <View style={styles.badgePill}>
          <Text style={styles.eyebrow}>✦ BUILD WITH CONFIDENCE</Text>
        </View>
        <Text style={styles.title}>
          {settings?.mobileHeroTitle || "Quality Construction Materials"}
        </Text>
        <Text style={styles.subtitle}>
          {settings?.mobileHeroSubtitle ||
            "ACC Cement, Nuvoco Cement, Tata & Mongia steel rods, roofing sheets, waterproofing chemicals and more — at the best prices."}
        </Text>
        <Link href="/(tabs)/products" asChild>
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [styles.cta, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }]}
          >
            <Text style={styles.ctaText}>Browse Products</Text>
            <Text style={styles.ctaArrow}>→</Text>
          </Pressable>
        </Link>
        {loading ? <Text style={styles.connecting}>Connecting to business services…</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    minHeight: 236,
    marginTop: 16,
    overflow: "hidden",
    borderRadius: 22,
    backgroundColor: theme.colors.primaryDark,
    ...theme.shadow,
    elevation: 3,
  },
  decorativeImage: {
    position: "absolute",
    right: -10,
    bottom: -10,
    width: "46%",
    height: "56%",
    opacity: 0.9,
  },
  content: {
    flex: 1,
    minHeight: 236,
    justifyContent: "center",
    padding: 20,
    paddingRight: "36%",
  },
  badgePill: {
    alignSelf: "flex-start",
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: 999,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.18)",
  },
  eyebrow: {
    color: "#99F6E4",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  title: {
    marginTop: 8,
    color: "white",
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "900",
  },
  subtitle: {
    marginTop: 8,
    color: "#D5F5F0",
    fontSize: 12,
    lineHeight: 17,
  },
  cta: {
    minHeight: 40,
    marginTop: 16,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: theme.colors.secondary,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  ctaText: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: "900",
  },
  ctaArrow: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: "900",
  },
  connecting: {
    marginTop: 10,
    color: "#CCFBF1",
    fontSize: 11,
  },
});
