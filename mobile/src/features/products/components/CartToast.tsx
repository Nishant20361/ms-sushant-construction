import { StyleSheet, Text, View } from "react-native";
import { theme } from "@/theme";
export function CartToast({ message }: { message: string }) { return message ? <View accessibilityRole="alert" style={styles.toast}><Text numberOfLines={2} style={styles.text}>✓  {message}</Text></View> : null; }
const styles = StyleSheet.create({ toast: { position: "absolute", left: 18, right: 18, bottom: 82, minHeight: 48, justifyContent: "center", paddingHorizontal: 16, borderRadius: 14, backgroundColor: theme.colors.text, ...theme.shadow }, text: { color: "white", fontWeight: "700" } });
