import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { theme } from "@/theme";

export function HomeSearchBar() {
  const router = useRouter();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Search construction products"
      onPress={() => router.push("/search")}
      style={({ pressed }) => [styles.search, pressed && styles.pressed]}
    >
      <View style={styles.row}>
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>🔍</Text>
        </View>
        <View style={styles.copy}>
          <Text numberOfLines={1} style={styles.placeholder}>
            Search cement, steel, roofing sheets…
          </Text>
          <Text numberOfLines={1} style={styles.hindi}>
            सीमेंट, सरिया, शीट आदि खोजें
          </Text>
        </View>
        <View style={styles.arrowContainer}>
          <Text style={styles.arrow}>→</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  search: {
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    ...theme.shadow,
    shadowOpacity: 0.06,
    elevation: 3,
  },
  row: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
    borderColor: theme.colors.primary,
  },
  iconContainer: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#F0FDFA",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
    borderWidth: 1,
    borderColor: "#CCFBF1",
  },
  icon: {
    fontSize: 17,
  },
  copy: {
    minWidth: 0,
    flexGrow: 1,
    flexShrink: 1,
    justifyContent: "center",
    gap: 2,
  },
  placeholder: {
    fontSize: 13.5,
    lineHeight: 18,
    fontWeight: "700",
    color: theme.colors.text,
  },
  hindi: {
    fontSize: 11,
    lineHeight: 15,
    color: theme.colors.muted,
    fontWeight: "500",
  },
  arrowContainer: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  arrow: {
    fontSize: 15,
    fontWeight: "800",
    color: "white",
  },
});
