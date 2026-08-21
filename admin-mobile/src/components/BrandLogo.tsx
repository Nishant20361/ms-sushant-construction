import { Image, StyleSheet, View } from "react-native";
import { useTheme } from "@/theme";
export function BrandLogo({ size = 72, compact = false }: { size?: number; compact?: boolean }) { const { radius } = useTheme(); return <View accessibilityRole="image" accessibilityLabel="Sushant Control logo" style={{ width: size, height: size, borderRadius: compact ? radius.medium : radius.large, overflow: "hidden" }}><Image source={require("../../assets/logo-mark.png")} resizeMode="contain" fadeDuration={0} style={StyleSheet.absoluteFill} /></View>; }
