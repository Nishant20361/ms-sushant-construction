import { Image } from "expo-image";
import { Link } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Pressable, StyleSheet, Text, View } from "react-native";
import type { SiteSettings } from "@/types/domain";
import { theme } from "@/theme";
import { IMAGE_BLURHASH, resolveImageUrl } from "@/utils/images";

const SLIDE_DURATION = 5500;
const FADE_DURATION = 1000;
type HeroSlide = { url: string; label: string };
const DEFAULT_SLIDES: HeroSlide[] = [
  { url: "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=1200&q=82", label: "Heavy Civil Works" },
  { url: "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=1200&q=82", label: "Certified Fe 500D Steel" },
  { url: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1200&q=82", label: "Premium Cement & Concrete" },
  { url: "https://images.unsplash.com/photo-1590069261209-f8e9b8642343?auto=format&fit=crop&w=1200&q=82", label: "Bricks, Sand & Mortar" },
  { url: "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=82", label: "Roofing & Waterproofing" },
];

export function HeroBanner({ settings, loading }: { settings?: SiteSettings | null; loading: boolean }) {
  const slides = useMemo(() => {
    const configured = [
      { url: resolveImageUrl(settings?.mobileHeroBannerUrl, 1200), label: "Featured for Mobile" },
      { url: resolveImageUrl(settings?.heroBannerUrl, 1200), label: "Direct Supplies" },
    ].filter((slide): slide is HeroSlide => Boolean(slide.url));
    return [...configured.filter((slide, index) => configured.findIndex((item) => item.url === slide.url) === index), ...DEFAULT_SLIDES];
  }, [settings?.heroBannerUrl, settings?.mobileHeroBannerUrl]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [failedUrls, setFailedUrls] = useState<string[]>([]);
  const fade = useRef(new Animated.Value(1)).current;
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => { setCurrentSlide(0); setFailedUrls([]); }, [settings?.heroBannerUrl, settings?.mobileHeroBannerUrl]);
  useEffect(() => {
    scale.setValue(1);
    Animated.timing(scale, { toValue: 1.06, duration: 7000, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  }, [currentSlide, scale]);
  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => {
      Animated.timing(fade, { toValue: 0, duration: FADE_DURATION / 2, useNativeDriver: true }).start(() => {
        setCurrentSlide((value) => (value + 1) % slides.length);
        fade.setValue(0);
        Animated.timing(fade, { toValue: 1, duration: FADE_DURATION / 2, useNativeDriver: true }).start();
      });
    }, SLIDE_DURATION);
    return () => clearInterval(timer);
  }, [fade, slides.length]);
  const goToSlide = (index: number) => {
    if (index === currentSlide) return;
    Animated.timing(fade, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => {
      setCurrentSlide(index); fade.setValue(0);
      Animated.timing(fade, { toValue: 1, duration: 280, useNativeDriver: true }).start();
    });
  };
  const slide = slides[currentSlide];
  const showImage = slide && !failedUrls.includes(slide.url);

  return <View style={styles.hero} accessibilityRole="summary" accessibilityLabel="Construction materials offers">
    {showImage ? <Animated.View style={[StyleSheet.absoluteFill, { opacity: fade, transform: [{ scale }] }]}>
      <Image source={slide.url} placeholder={{ blurhash: IMAGE_BLURHASH }} cachePolicy="memory-disk" contentFit="cover" transition={180} style={StyleSheet.absoluteFill} accessibilityLabel={slide.label} onError={() => setFailedUrls((urls) => [...new Set([...urls, slide.url])])} />
    </Animated.View> : null}
    <View style={styles.overlay} /><View style={styles.topShade} />
    <View style={styles.content}>
      <View style={styles.badges}><View style={styles.badgePill}><Text style={styles.eyebrow}>★ TRUSTED SUPPLIER</Text></View><View style={styles.slideLabel}><Text numberOfLines={1} style={styles.slideLabelText}>{slide?.label}</Text></View></View>
      <Text style={styles.title}>{settings?.mobileHeroTitle || settings?.heroTitle || "Quality Construction Materials"}</Text>
      <Text numberOfLines={3} style={styles.subtitle}>{settings?.mobileHeroSubtitle || settings?.heroSubtitle || "Cement, steel rods, roofing sheets, waterproofing chemicals and more — delivered at the best prices."}</Text>
      <Link href="/(tabs)/products" asChild><Pressable accessibilityRole="button" style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}><Text style={styles.ctaText}>Browse Products</Text><Text style={styles.ctaArrow}>→</Text></Pressable></Link>
      {loading ? <Text style={styles.connecting}>Syncing latest offers…</Text> : null}
    </View>
    <View style={styles.dots} accessibilityRole="tablist">{slides.map((item, index) => <Pressable key={`${item.url}-${index}`} accessibilityRole="tab" accessibilityLabel={`Show banner ${index + 1}`} accessibilityState={{ selected: index === currentSlide }} hitSlop={8} onPress={() => goToSlide(index)} style={[styles.dot, index === currentSlide && styles.activeDot]} />)}</View>
  </View>;
}

const styles = StyleSheet.create({
  hero: { minHeight: 310, marginTop: 16, overflow: "hidden", borderRadius: 24, backgroundColor: theme.colors.primaryDark, ...theme.shadow, elevation: 4 },
  overlay: { position: "absolute", inset: 0, backgroundColor: "rgba(3, 20, 26, 0.58)" }, topShade: { position: "absolute", inset: 0, backgroundColor: "rgba(0, 0, 0, 0.12)" },
  content: { flex: 1, minHeight: 310, justifyContent: "center", padding: 20, paddingBottom: 42 }, badges: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 7 },
  badgePill: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999, backgroundColor: "rgba(13, 148, 136, 0.92)", borderWidth: 1, borderColor: "rgba(255,255,255,0.24)" }, eyebrow: { color: "white", fontSize: 9, fontWeight: "900", letterSpacing: 0.65 },
  slideLabel: { maxWidth: "55%", paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.16)", borderWidth: 1, borderColor: "rgba(255,255,255,0.22)" }, slideLabelText: { color: "white", fontSize: 9, fontWeight: "800" },
  title: { maxWidth: "90%", marginTop: 12, color: "white", fontSize: 27, lineHeight: 33, fontWeight: "900", textShadowColor: "rgba(0,0,0,0.4)", textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 6 },
  subtitle: { maxWidth: "92%", marginTop: 9, color: "#E6FFFB", fontSize: 13, lineHeight: 19, fontWeight: "500", textShadowColor: "rgba(0,0,0,0.5)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  cta: { minHeight: 42, marginTop: 17, alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 9, paddingHorizontal: 17, borderRadius: 13, backgroundColor: theme.colors.secondary, shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 7, shadowOffset: { width: 0, height: 3 }, elevation: 3 }, ctaPressed: { opacity: 0.88, transform: [{ scale: 0.98 }] },
  ctaText: { color: theme.colors.text, fontSize: 13, fontWeight: "900" }, ctaArrow: { color: theme.colors.text, fontSize: 17, fontWeight: "900" }, connecting: { marginTop: 9, color: "#CCFBF1", fontSize: 10 },
  dots: { position: "absolute", left: 20, right: 20, bottom: 15, flexDirection: "row", alignItems: "center", gap: 7 }, dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.48)" }, activeDot: { width: 23, backgroundColor: theme.colors.secondary },
});
