import { useState } from "react";
import { Image } from "expo-image";
import { FlatList, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import type { Product } from "@/types/domain";
import { FALLBACK_IMAGE, IMAGE_BLURHASH, resolveImageUrl } from "@/utils/images";
import { theme } from "@/theme";

export function ProductImageGallery({ product }: { product: Product }) {
  const { width } = useWindowDimensions();
  const itemWidth = Math.max(280, width - 28);
  const [active, setActive] = useState(0);
  const images = product.images.length ? product.images : [{ id: -1, url: "", alt: product.name, isPrimary: true }];
  return <View><FlatList horizontal pagingEnabled data={images} keyExtractor={(item) => String(item.id)} showsHorizontalScrollIndicator={false} getItemLayout={(_, index) => ({ length: itemWidth, offset: itemWidth * index, index })} onMomentumScrollEnd={(event) => setActive(Math.round(event.nativeEvent.contentOffset.x / itemWidth))} renderItem={({ item, index }) => <View style={[styles.slide, { width: itemWidth }]}><Image source={resolveImageUrl(item.url, 1200) || FALLBACK_IMAGE} placeholder={{ blurhash: IMAGE_BLURHASH }} cachePolicy="memory-disk" contentFit="contain" transition={180} accessibilityLabel={item.alt || `${product.name}, image ${index + 1} of ${images.length}`} style={styles.image} /></View>} />{images.length > 1 ? <View style={styles.dots}>{images.map((image, index) => <View key={image.id} style={[styles.dot, active === index && styles.activeDot]} />)}<Text style={styles.count}>{active + 1}/{images.length}</Text></View> : null}</View>;
}
const styles = StyleSheet.create({ slide: { height: 330, padding: 8 }, image: { flex: 1, borderRadius: 18, backgroundColor: theme.colors.surface }, dots: { minHeight: 30, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 }, dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: theme.colors.border }, activeDot: { width: 18, backgroundColor: theme.colors.primary }, count: { marginLeft: 8, color: theme.colors.muted, fontSize: 11 } });
