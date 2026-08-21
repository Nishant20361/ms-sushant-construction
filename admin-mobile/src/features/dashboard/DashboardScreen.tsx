import { RefreshControl, StyleSheet, useWindowDimensions, View } from "react-native";
import { router } from "expo-router";
import { useNetInfo } from "@react-native-community/netinfo";
import { AppText } from "@/components/AppText";
import { Screen } from "@/components/Screen";
import { EmptyState, ErrorState } from "@/components/ui";
import { useAuth } from "@/features/auth/AuthProvider";
import { AdminAppError } from "@/types/errors";
import { useTheme } from "@/theme";
import { DashboardHeader, DashboardMetricGrid, DashboardSection, DashboardSkeleton, FinancialHero, LowStockRow, OfflineBanner, RecentOrderRow, TextAction } from "./components";
import { updatedLabel } from "./presentation";
import { useDashboardOverview, useNotificationSummary } from "./useDashboard";
function dashboardError(error: unknown) { if (error instanceof AdminAppError) { if (error.kind === "network" || error.kind === "timeout") return "You're offline. Connect to the internet and try again."; if (error.kind === "forbidden") return "You don't have access to this overview."; if (error.kind === "rate_limited") return "Too many requests. Please try again later."; if (error.kind === "server") return "The Dashboard service is unavailable. Please try again."; } return "The Dashboard could not be loaded. Please try again."; }
export function DashboardScreen() {
  const t = useTheme(); const auth = useAuth(); const network = useNetInfo(); const { width } = useWindowDimensions(); const overview = useDashboardOverview(); const notifications = useNotificationSummary();
  const offline = network.isConnected === false || network.isInternetReachable === false;
  const available = Math.min(width, 620) - t.spacing.lg * 2; const cardWidth = Math.max(128, (available - 12) / 2);
  const refresh = async () => { await Promise.allSettled([overview.refetch(), notifications.refetch()]); };
  if (!overview.data && offline) return <Screen centered><ErrorState title="You're offline" description="Connect to the internet to load the business overview." onRetry={() => void refresh()} /></Screen>;
  if (!overview.data && overview.isPending) return <Screen contentStyle={{ paddingBottom: t.spacing.xxxl }}><DashboardSkeleton cardWidth={cardWidth} /></Screen>;
  if (!overview.data && overview.error) return <Screen centered><ErrorState description={dashboardError(overview.error)} onRetry={() => void refresh()} /></Screen>;
  if (!overview.data) return null;
  const data = overview.data; const staleError = overview.error ? dashboardError(overview.error) : null;
  return <Screen scrollProps={{ refreshControl: <RefreshControl refreshing={overview.isRefetching || notifications.isRefetching} onRefresh={() => void refresh()} colors={[t.colors.brand]} tintColor={t.colors.brand} progressBackgroundColor={t.colors.surfaceElevated} /> }} contentStyle={[s.content, { gap: t.spacing.xl, paddingBottom: t.spacing.xxxl }]}>
    <DashboardHeader username={auth.admin?.username ?? "Admin"} unreadCount={notifications.data?.unreadCount} onNotifications={() => router.push("/(admin)/notifications" as never)} onProfile={() => router.push("/(admin)/(tabs)/more" as never)} />
    {offline ? <OfflineBanner /> : staleError && <OfflineBanner message={`${staleError} Showing last loaded data.`} />}
    <FinancialHero stats={data.stats} />
    <View style={s.sectionHeading}><AppText role="sectionTitle">At a glance</AppText><AppText role="caption" style={{ color: t.colors.textMuted }}>{updatedLabel(overview.dataUpdatedAt)}</AppText></View>
    <DashboardMetricGrid stats={data.stats} cardWidth={cardWidth} />
    <DashboardSection title="Recent orders" action={<TextAction label="View all" onPress={() => router.push("/(admin)/(tabs)/orders" as never)} />}>{data.recentOrders.length ? data.recentOrders.map((order, index) => <RecentOrderRow key={order.id || `${order.orderNumber}-${index}`} order={order} last={index === data.recentOrders.length - 1} />) : <EmptyState title="No orders yet" description="Recent orders will appear here when business activity begins." />}</DashboardSection>
    <DashboardSection title="Low-stock preview" action={<TextAction label="Products" onPress={() => router.push("/(admin)/(tabs)/products" as never)} />}>{data.lowStockProducts.length ? data.lowStockProducts.slice(0, 5).map((product, index) => <LowStockRow key={product.id || `${product.name}-${index}`} product={product} last={index === Math.min(data.lowStockProducts.length, 5) - 1} />) : <EmptyState title="Stock levels look healthy" description="No active products are at or below the configured threshold." />}<AppText role="caption" style={{ color: t.colors.textMuted }}>Preview only · backend returns at most 10 flagged products.</AppText></DashboardSection>
  </Screen>;
}
const s = StyleSheet.create({ content: { width: "100%", maxWidth: 620, alignSelf: "center" }, sectionHeading: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", gap: 12 } });
