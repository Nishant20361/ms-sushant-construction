import type { PropsWithChildren } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View, type ScrollViewProps, type StyleProp, type ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@/theme";
interface Props extends PropsWithChildren { scroll?: boolean; keyboardAware?: boolean; centered?: boolean; contentStyle?: StyleProp<ViewStyle>; scrollProps?: ScrollViewProps }
export function Screen({ children, scroll = true, keyboardAware = false, centered = false, contentStyle, scrollProps }: Props) {
  const { colors, spacing } = useTheme();
  const body = scroll ? <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} {...scrollProps} contentContainerStyle={[styles.content, centered && styles.centered, { padding: spacing.lg }, contentStyle]}>{children}</ScrollView> : <View style={[styles.content, centered && styles.centered, { padding: spacing.lg }, contentStyle]}>{children}</View>;
  return <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>{keyboardAware ? <KeyboardAvoidingView style={styles.safe} behavior={Platform.OS === "ios" ? "padding" : undefined}>{body}</KeyboardAvoidingView> : body}</SafeAreaView>;
}
const styles = StyleSheet.create({ safe: { flex: 1 }, content: { flexGrow: 1 }, centered: { justifyContent: "center" } });
