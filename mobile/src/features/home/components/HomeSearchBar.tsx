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
          <Text style={styles.arrow}>›</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  search: {
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1.5,
    borderColor: "#CCFBF1",
    borderRadius: 18,
    backgroundColor: theme.colors.surface,
    ...theme.shadow,
    elevation: 2,
  },
  row: {
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: "#F0FDFA",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  icon: {
    fontSize: 17,
  },
  copy: {
    minWidth: 0,
    flexGrow: 1,
    flexShrink: 1,
    justifyContent: "center",
  },
  placeholder: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700",
    color: theme.colors.text,
  },
  hindi: {
    marginTop: 1.5,
    fontSize: 11,
    lineHeight: 15,
    color: theme.colors.muted,
  },
  arrowContainer: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 6,
  },
  arrow: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.colors.primary,
    marginTop: -2,
  },
});
