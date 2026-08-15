import { StyleSheet, Text, View } from "react-native";
import { SectionHeader } from "./SectionHeader";
import { theme } from "@/theme";

const points = [
  { icon: "✓", title: "Quality materials", body: "Product details and availability from our current catalogue." },
  { icon: "₹", title: "Clear pricing", body: "See current listed prices before placing an order." },
  { icon: "⌖", title: "Order tracking", body: "Track safely using your order number and mobile." },
  { icon: "☎", title: "Local support", body: "Contact the business directly when you need help." },
];

export function TrustSection() {
  return <View style={styles.section}><SectionHeader title="Why customers choose us" /><View style={styles.grid}>{points.map((point) => <View key={point.title} style={styles.point}><View style={styles.icon}><Text style={styles.iconText}>{point.icon}</Text></View><View style={styles.copy}><Text style={styles.title}>{point.title}</Text><Text style={styles.body}>{point.body}</Text></View></View>)}</View></View>;
}
const styles = StyleSheet.create({ section: { marginTop: 30 }, grid: { marginTop: 14, gap: 10 }, point: { minHeight: 76, flexDirection: "row", alignItems: "center", gap: 12, padding: 13, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 15, backgroundColor: theme.colors.surface }, icon: { width: 42, height: 42, alignItems: "center", justifyContent: "center", borderRadius: 13, backgroundColor: "#ECFDF5" }, iconText: { color: theme.colors.success, fontSize: 20, fontWeight: "900" }, copy: { flex: 1 }, title: { fontWeight: "800", color: theme.colors.text }, body: { marginTop: 3, fontSize: 12, lineHeight: 17, color: theme.colors.muted } });
