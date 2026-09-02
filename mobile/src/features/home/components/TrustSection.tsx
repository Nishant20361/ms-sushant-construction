import { StyleSheet, Text, View } from "react-native";
import { SectionHeader } from "./SectionHeader";
import { theme } from "@/theme";

const points = [
  { icon: "✓", title: "Genuine Quality", body: "Authentic branded construction materials from trusted manufacturers.", color: "#10B981", bg: "#ECFDF5" },
  { icon: "₹", title: "Transparent Pricing", body: "See current listed prices upfront — no hidden costs or surprises.", color: "#0D9488", bg: "#F0FDFA" },
  { icon: "⌖", title: "Order Tracking", body: "Track your delivery in real-time using order number & mobile.", color: "#3B82F6", bg: "#EFF6FF" },
  { icon: "☎", title: "Local Support", body: "Direct access to the business team for any help you need.", color: "#D97706", bg: "#FFFBEB" },
];

export function TrustSection() {
  return (
    <View style={styles.section}>
      <SectionHeader title="Why Choose Us" subtitle="Reliable service & authentic quality" />
      <View style={styles.grid}>
        {points.map((point) => (
          <View key={point.title} style={styles.point}>
            <View style={[styles.iconContainer, { backgroundColor: point.bg }]}>
              <Text style={[styles.iconText, { color: point.color }]}>{point.icon}</Text>
            </View>
            <View style={styles.copy}>
              <Text style={styles.title}>{point.title}</Text>
              <Text style={styles.body}>{point.body}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: 28,
  },
  grid: {
    marginTop: 12,
    gap: 10,
  },
  point: {
    minHeight: 74,
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 18,
    backgroundColor: theme.colors.surface,
    ...theme.shadow,
    shadowOpacity: 0.05,
    elevation: 1.5,
  },
  iconContainer: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
  },
  iconText: {
    fontSize: 20,
    fontWeight: "900",
  },
  copy: {
    flex: 1,
    gap: 3,
  },
  title: {
    fontWeight: "800",
    fontSize: 14,
    color: theme.colors.text,
    letterSpacing: -0.1,
  },
  body: {
    fontSize: 12,
    lineHeight: 17,
    color: theme.colors.muted,
    fontWeight: "400",
  },
});
