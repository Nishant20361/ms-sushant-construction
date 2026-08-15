import { StyleSheet, View } from "react-native";
import { theme } from "@/theme";

export function ProductSkeleton() {
  return <View style={styles.card}><View style={styles.image} /><View style={styles.lineWide} /><View style={styles.line} /></View>;
}
const styles = StyleSheet.create({ card: { width: "48%", padding: 10, borderRadius: 12, backgroundColor: theme.colors.surface }, image: { height: 120, borderRadius: 8, backgroundColor: theme.colors.border }, lineWide: { width: "85%", height: 14, marginTop: 12, borderRadius: 7, backgroundColor: theme.colors.border }, line: { width: "55%", height: 12, marginTop: 8, borderRadius: 6, backgroundColor: theme.colors.border } });
