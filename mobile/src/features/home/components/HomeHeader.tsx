import { Image } from "expo-image";
import { Link } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { selectCartCount, useCartStore } from "@/store/cartStore";
import { theme } from "@/theme";
import { resolveImageUrl } from "@/utils/images";

export function HomeHeader({ companyName, logoUrl }: { companyName: string; logoUrl?: string | null }) {
  const count = useCartStore(selectCartCount);
  const logo = resolveImageUrl(logoUrl, 120);
  return (
    <View style={styles.header}>
      <View style={styles.identity}>
        {logo ? (
          <View style={styles.logoContainer}>
            <Image
              source={logo}
              cachePolicy="memory-disk"
              contentFit="contain"
              accessibilityLabel={`${companyName} logo`}
              style={styles.logo}
            />
          </View>
        ) : (
          <View style={styles.fallback}>
            <Text style={styles.fallbackText}>MS</Text>
          </View>
        )}
        <View style={styles.copy}>
          <Text
            numberOfLines={2}
            adjustsFontSizeToFit
            minimumFontScale={0.88}
            style={styles.name}
          >
            {companyName}
          </Text>
          <View style={styles.taglineRow}>
            <View style={styles.verifiedDot} />
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.88}
              style={styles.subtitle}
            >
              Construction Materials & Services
            </Text>
          </View>
        </View>
      </View>

      {/* Notification bell could go here in future */}

      <Link href="/(tabs)/cart" asChild>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Open cart, ${Math.ceil(count)} items`}
          hitSlop={8}
          style={({ pressed }) => [styles.cart, pressed && styles.cartPressed]}
        >
          <Text style={styles.cartIcon}>🛒</Text>
          {count > 0 ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {Math.min(99, Math.ceil(count))}
              </Text>
            </View>
          ) : null}
        </Pressable>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 6,
  },
  identity: {
    minWidth: 0,
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },
  logoContainer: {
    width: 46,
    height: 46,
    borderRadius: 15,
    overflow: "hidden",
    backgroundColor: theme.colors.surface,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    ...theme.shadow,
    elevation: 3,
  },
  logo: {
    width: 46,
    height: 46,
  },
  fallback: {
    width: 46,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 15,
    backgroundColor: theme.colors.primary,
    ...theme.shadow,
    elevation: 3,
  },
  fallbackText: {
    color: "white",
    fontSize: 17,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  copy: {
    minWidth: 0,
    flex: 1,
    gap: 3,
  },
  name: {
    fontSize: 17,
    lineHeight: 21,
    fontWeight: "900",
    color: theme.colors.text,
    letterSpacing: -0.3,
  },
  taglineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  verifiedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#10B981",
  },
  subtitle: {
    fontSize: 11,
    fontWeight: "600",
    color: theme.colors.muted,
  },
  cart: {
    width: 46,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 15,
    backgroundColor: theme.colors.surface,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    ...theme.shadow,
    elevation: 3,
  },
  cartPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.95 }],
  },
  cartIcon: {
    fontSize: 21,
  },
  badge: {
    position: "absolute",
    top: -3,
    right: -3,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
    borderRadius: 10,
    backgroundColor: theme.colors.secondary,
    borderWidth: 2,
    borderColor: theme.colors.surface,
  },
  badgeText: {
    color: "#1a1a1a",
    fontSize: 10,
    fontWeight: "900",
  },
});
