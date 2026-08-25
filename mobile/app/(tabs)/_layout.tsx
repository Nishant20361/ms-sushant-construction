import { Tabs } from "expo-router";
import { Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCartStore, selectCartCount } from "@/store/cartStore";
import { theme } from "@/theme";

const icons: Record<string, string> = {
  index: "🏠",
  products: "📦",
  assistant: "🤖",
  track: "🚚",
  cart: "🛒",
};

export default function TabLayout() {
  const cartCount = useCartStore(selectCartCount);
  const cartHydrated = useCartStore((state) => state.hasHydrated);
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, 8);

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.muted,
        tabBarStyle: {
          height: 60 + bottomPadding,
          paddingTop: 6,
          paddingBottom: bottomPadding,
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
          borderTopWidth: 1,
          elevation: 8,
          shadowColor: "#0F172A",
          shadowOpacity: 0.06,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: -2 },
        },
        tabBarItemStyle: { paddingVertical: 2 },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "700" },
        tabBarIconStyle: { marginBottom: 2 },
        tabBarIcon: () => (
          <Text style={{ fontSize: 20 }}>{icons[route.name]}</Text>
        ),
      })}
    >
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="products" options={{ title: "Products" }} />
      <Tabs.Screen name="assistant" options={{ title: "AI Assistant" }} />
      <Tabs.Screen name="track" options={{ title: "Track Order" }} />
      <Tabs.Screen
        name="cart"
        options={{
          title: "Cart",
          tabBarBadge: cartHydrated && cartCount > 0 ? Math.ceil(cartCount) : undefined,
          tabBarBadgeStyle: {
            backgroundColor: theme.colors.secondary,
            color: theme.colors.text,
            fontWeight: "900",
            fontSize: 10,
          },
        }}
      />
    </Tabs>
  );
}
