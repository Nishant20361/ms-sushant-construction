import "react-native-gesture-handler";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppErrorBoundary } from "@/components/AppErrorBoundary";
import { OfflineBanner } from "@/components/OfflineBanner";
import { PublicQueryCacheProvider } from "@/components/PublicQueryCacheProvider";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { theme } from "@/theme";

function AppNavigation() {
  useNetworkStatus();
  return <>
    <StatusBar style="dark" />
    <OfflineBanner />
    <Stack screenOptions={{ headerStyle: { backgroundColor: theme.colors.surface }, headerTintColor: theme.colors.primaryDark, headerTitleStyle: { fontWeight: "700" }, contentStyle: { backgroundColor: theme.colors.background } }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="product/[id]" options={{ title: "Product Details" }} />
      <Stack.Screen name="category/[slug]" options={{ title: "Category" }} />
      <Stack.Screen name="search" options={{ title: "Search" }} />
      <Stack.Screen name="checkout" options={{ title: "Checkout" }} />
      <Stack.Screen name="order-success" options={{ title: "Order Placed", gestureEnabled: false }} />
      <Stack.Screen name="about" options={{ title: "About & Contact" }} />
      <Stack.Screen name="+not-found" options={{ title: "Not Found" }} />
    </Stack>
  </>;
}

export default function RootLayout() {
  return <AppErrorBoundary><PublicQueryCacheProvider><SafeAreaProvider><AppNavigation /></SafeAreaProvider></PublicQueryCacheProvider></AppErrorBoundary>;
}
