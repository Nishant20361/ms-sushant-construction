import { Tabs } from "expo-router";
import { Text } from "react-native";
import { useCartStore, selectCartCount } from "@/store/cartStore";
import { theme } from "@/theme";

const icons: Record<string, string> = { index: "⌂", products: "▦", assistant: "✦", track: "⌖", cart: "🛒" };

export default function TabLayout() {
  const cartCount = useCartStore(selectCartCount);
  const cartHydrated = useCartStore((state) => state.hasHydrated);
  return <Tabs screenOptions={({ route }) => ({ headerShown: false, tabBarActiveTintColor: theme.colors.primary, tabBarInactiveTintColor: theme.colors.muted, tabBarStyle: { minHeight: 66, paddingTop: 6, paddingBottom: 8, backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border }, tabBarLabelStyle: { fontSize: 11, fontWeight: "600" }, tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 21 }}>{icons[route.name]}</Text> })}>
    <Tabs.Screen name="index" options={{ title: "Home" }} />
    <Tabs.Screen name="products" options={{ title: "Products" }} />
    <Tabs.Screen name="assistant" options={{ title: "AI Assistant" }} />
    <Tabs.Screen name="track" options={{ title: "Track Order" }} />
    <Tabs.Screen name="cart" options={{ title: "Cart", tabBarBadge: cartHydrated && cartCount > 0 ? Math.ceil(cartCount) : undefined, tabBarBadgeStyle: { backgroundColor: theme.colors.secondary, color: theme.colors.text } }} />
  </Tabs>;
}
