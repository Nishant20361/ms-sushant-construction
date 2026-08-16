import { Tabs } from "expo-router";
import { Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCartStore, selectCartCount } from "@/store/cartStore";
import { theme } from "@/theme";

const icons: Record<string, string> = { index: "⌂", products: "▦", assistant: "✦", track: "⌖", cart: "🛒" };

export default function TabLayout() {
  const cartCount = useCartStore(selectCartCount);
  const cartHydrated = useCartStore((state) => state.hasHydrated);
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, 6);
  return <Tabs screenOptions={({ route }) => ({ headerShown: false, tabBarHideOnKeyboard: true, tabBarActiveTintColor: theme.colors.primary, tabBarInactiveTintColor: theme.colors.muted, tabBarStyle: { height: 58 + bottomPadding, paddingTop: 5, paddingBottom: bottomPadding, backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border }, tabBarItemStyle: { paddingVertical: 1 }, tabBarLabelStyle: { fontSize: 10.5, lineHeight: 14, fontWeight: "600" }, tabBarIconStyle: { marginBottom: 1 }, tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20, lineHeight: 23 }}>{icons[route.name]}</Text> })}>
    <Tabs.Screen name="index" options={{ title: "Home" }} />
    <Tabs.Screen name="products" options={{ title: "Products" }} />
    <Tabs.Screen name="assistant" options={{ title: "AI Assistant" }} />
    <Tabs.Screen name="track" options={{ title: "Track Order" }} />
    <Tabs.Screen name="cart" options={{ title: "Cart", tabBarBadge: cartHydrated && cartCount > 0 ? Math.ceil(cartCount) : undefined, tabBarBadgeStyle: { backgroundColor: theme.colors.secondary, color: theme.colors.text } }} />
  </Tabs>;
}
