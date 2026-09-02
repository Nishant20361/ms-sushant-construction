import { Tabs } from "expo-router";
import { Platform, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCartStore, selectCartCount } from "@/store/cartStore";
import { theme } from "@/theme";

const tabs: Array<{ name: string; label: string; icon: string; activeIcon: string }> = [
  { name: "index", label: "Home", icon: "🏠", activeIcon: "🏡" },
  { name: "products", label: "Products", icon: "📦", activeIcon: "📦" },
  { name: "assistant", label: "AI", icon: "🤖", activeIcon: "🤖" },
  { name: "track", label: "Track", icon: "🚚", activeIcon: "🚛" },
  { name: "cart", label: "Cart", icon: "🛒", activeIcon: "🛒" },
];

export default function TabLayout() {
  const cartCount = useCartStore(selectCartCount);
  const cartHydrated = useCartStore((state) => state.hasHydrated);
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, 10);

  return (
    <Tabs
      screenOptions={({ route }) => {
        const tab = tabs.find((t) => t.name === route.name);
        const focused = false; // will be overridden per-render
        return {
          headerShown: false,
          tabBarHideOnKeyboard: true,
          tabBarActiveTintColor: theme.colors.primary,
          tabBarInactiveTintColor: "#94A3B8",
          tabBarStyle: {
            height: 68 + bottomPadding,
            paddingTop: 8,
            paddingBottom: bottomPadding,
            backgroundColor: "rgba(255, 255, 255, 0.97)",
            borderTopColor: "rgba(226, 232, 240, 0.6)",
            borderTopWidth: StyleSheet.hairlineWidth,
            ...Platform.select({
              ios: {
                shadowColor: "#0F172A",
                shadowOpacity: 0.08,
                shadowRadius: 16,
                shadowOffset: { width: 0, height: -4 },
              },
              android: { elevation: 12 },
            }),
          },
          tabBarItemStyle: {
            paddingVertical: 2,
            gap: 2,
          },
          tabBarLabelStyle: {
            fontSize: 10.5,
            fontWeight: "700",
            letterSpacing: 0.1,
          },
          tabBarIcon: ({ focused: isFocused }) => (
            <View style={[s.iconWrap, isFocused && s.iconWrapActive]}>
              <Text style={[s.icon, isFocused && s.iconActive]}>
                {isFocused ? (tab?.activeIcon || "📄") : (tab?.icon || "📄")}
              </Text>
            </View>
          ),
        };
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="products" options={{ title: "Products" }} />
      <Tabs.Screen name="assistant" options={{ title: "AI Assistant" }} />
      <Tabs.Screen name="track" options={{ title: "Track" }} />
      <Tabs.Screen
        name="cart"
        options={{
          title: "Cart",
          tabBarBadge: cartHydrated && cartCount > 0 ? Math.ceil(cartCount) : undefined,
          tabBarBadgeStyle: {
            backgroundColor: theme.colors.secondary,
            color: "#1a1a1a",
            fontWeight: "900",
            fontSize: 9,
            minWidth: 18,
            height: 18,
            lineHeight: 17,
            borderRadius: 9,
            top: -2,
          },
        }}
      />
    </Tabs>
  );
}

const s = StyleSheet.create({
  iconWrap: {
    width: 40,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
  },
  iconWrapActive: {
    backgroundColor: "#F0FDFA",
    transform: [{ scale: 1.1 }],
  },
  icon: {
    fontSize: 19,
  },
  iconActive: {
    fontSize: 21,
  },
});
