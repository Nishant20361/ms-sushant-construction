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
  return (
    <View style={styles.section}>
      <SectionHeader title="Why choose us" subtitle="Reliable service & authentic quality" />
      <View style={styles.grid}>
        {points.map((point) => (
          <View key={point.title} style={styles.point}>
            <View style={styles.icon}>
              <Text style={styles.iconText}>{point.icon}</Text>
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
    minHeight: 70,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
    ...theme.shadow,
    elevation: 1.5,
  },
  icon: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#ECFDF5",
  },
  iconText: {
    color: theme.colors.success,
    fontSize: 18,
    fontWeight: "900",
  },
  copy: {
    flex: 1,
  },
  title: {
    fontWeight: "800",
    fontSize: 13.5,
    color: theme.colors.text,
  },
  body: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 16,
    color: theme.colors.muted,
  },
});
