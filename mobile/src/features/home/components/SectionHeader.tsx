import type { Href } from "expo-router";
import { Link } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { theme } from "@/theme";

export function SectionHeader({ title, subtitle, actionLabel, href }: { title: string; subtitle?: string; actionLabel?: string; href?: Href }) {
  return (
    <View style={styles.row}>
      <View style={styles.copy}>
        <View style={styles.titleRow}>
          <View style={styles.accentBar} />
          <Text style={styles.title}>{title}</Text>
        </View>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {href && actionLabel ? (
        <Link href={href} asChild>
          <Pressable
            accessibilityRole="link"
            hitSlop={8}
            style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}
          >
            <Text style={styles.actionText}>{actionLabel}</Text>
            <Text style={styles.actionArrow}>→</Text>
          </Pressable>
        </Link>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  copy: {
    flex: 1,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  accentBar: {
    width: 3.5,
    height: 18,
    borderRadius: 2,
    backgroundColor: theme.colors.primary,
  },
  title: {
    fontSize: 18,
    fontWeight: "900",
    color: theme.colors.text,
    letterSpacing: -0.3,
  },
  subtitle: {
    marginTop: 3,
    marginLeft: 11.5,
    fontSize: 12,
    color: theme.colors.muted,
    fontWeight: "500",
  },
  action: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: "#F0FDFA",
    borderWidth: 1,
    borderColor: "#CCFBF1",
  },
  actionPressed: {
    opacity: 0.75,
    backgroundColor: "#CCFBF1",
  },
  actionText: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: "800",
  },
  actionArrow: {
    color: theme.colors.primary,
    fontSize: 13,
    fontWeight: "800",
  },
});
