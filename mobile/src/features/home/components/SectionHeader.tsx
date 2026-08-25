import type { Href } from "expo-router";
import { Link } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { theme } from "@/theme";

export function SectionHeader({ title, subtitle, actionLabel, href }: { title: string; subtitle?: string; actionLabel?: string; href?: Href }) {
  return (
    <View style={styles.row}>
      <View style={styles.copy}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {href && actionLabel ? (
        <Link href={href} asChild>
          <Pressable
            accessibilityRole="link"
            hitSlop={8}
            style={({ pressed }) => [styles.action, pressed && { opacity: 0.75 }]}
          >
            <Text style={styles.actionText}>{actionLabel}</Text>
            <Text style={styles.actionArrow}>›</Text>
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
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: theme.colors.text,
    letterSpacing: -0.2,
  },
  subtitle: {
    marginTop: 2,
    fontSize: 12,
    color: theme.colors.muted,
  },
  action: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: "#F0FDFA",
  },
  actionText: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: "800",
  },
  actionArrow: {
    color: theme.colors.primary,
    fontSize: 16,
    fontWeight: "700",
    marginTop: -1,
  },
});
