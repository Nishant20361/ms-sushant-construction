import { useEffect, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ColdStartState } from "@/components/ColdStartState";
import { TimeoutError } from "@/services/apiClient";
import { useCartStore } from "@/store/cartStore";
import { theme } from "@/theme";
import type { Product } from "@/types/domain";
import { AIConstructionCard } from "./components/AIConstructionCard";
import { CategorySection } from "./components/CategorySection";
import { ContactCard } from "./components/ContactCard";
import { HeroBanner } from "./components/HeroBanner";
import { HomeHeader } from "./components/HomeHeader";
import { HomeSearchBar } from "./components/HomeSearchBar";
import { LatestUpdateTicker } from "./components/LatestUpdateTicker";
import { ProductSection } from "./components/ProductSection";
import { QuickActions } from "./components/QuickActions";
import { TrustSection } from "./components/TrustSection";
import { useHomeData } from "./hooks/useHomeData";

export default function HomeScreen() {
  const { settings, categories, products, isRefreshing, refreshAll } = useHomeData();
  const addItem = useCartStore((state) => state.addItem);
  const [cartMessage, setCartMessage] = useState("");
  const siteSettings = settings.data?.settings;
  const hasCachedContent = Boolean(siteSettings || categories.data?.categories.length || products.data?.products.length);
  const hasColdStart = [settings.error, categories.error, products.error].some((error) => error instanceof TimeoutError);

  useEffect(() => {
    if (!cartMessage) return;
    const timeout = setTimeout(() => setCartMessage(""), 2_000);
    return () => clearTimeout(timeout);
  }, [cartMessage]);

  const addToCart = (product: Product, quantity: number) => {
    if (product.stock <= 0) return;
    addItem(product, quantity);
    setCartMessage(`${product.name} added to cart`);
  };

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refreshAll}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
      >
        <HomeHeader
          companyName={siteSettings?.companyName || "MS Sushant Construction"}
          logoUrl={siteSettings?.logoUrl || siteSettings?.businessLogoUrl}
        />
        <HomeSearchBar />
        <HeroBanner settings={siteSettings} loading={settings.isPending} />

        {hasColdStart && !hasCachedContent ? <ColdStartState onRetry={refreshAll} /> : null}
        {hasColdStart && hasCachedContent ? (
          <View style={styles.coldNotice}>
            <Text style={styles.coldTitle}>Connecting to server…</Text>
            <Text style={styles.coldText}>Showing cached catalogue while services initialize.</Text>
          </View>
        ) : null}

        <LatestUpdateTicker enabled={siteSettings?.latestUpdateEnabled} text={siteSettings?.latestUpdateText} />
        <CategorySection
          categories={categories.data?.categories}
          loading={categories.isPending}
          error={categories.isError}
          onRetry={() => void categories.refetch()}
        />
        <QuickActions />
        <ProductSection
          products={products.data?.products}
          loading={products.isPending}
          error={products.isError}
          onRetry={() => void products.refetch()}
          onAdd={addToCart}
        />
        <AIConstructionCard />
        <TrustSection />
        <ContactCard
          settings={siteSettings}
          loading={settings.isPending}
          error={settings.isError}
          onRetry={() => void settings.refetch()}
        />

        <View style={styles.footerWrap}>
          <Text style={styles.footnote}>
            Prices shown in the app are for browsing. The server verifies current price, stock and final subtotal when an order is placed.
          </Text>
          <View style={styles.brandBadge}>
            <Text style={styles.brandBadgeText}>★ MS Sushant Construction · Bihar</Text>
          </View>
          <Text style={styles.developer}>Designed & Developed by Nishant</Text>
        </View>
      </ScrollView>

      {cartMessage ? (
        <View accessibilityRole="alert" style={styles.toast}>
          <View style={styles.toastDot} />
          <Text numberOfLines={2} style={styles.toastText}>
            ✓ {cartMessage}
          </Text>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 110,
  },
  coldNotice: {
    marginTop: 14,
    padding: 14,
    borderRadius: 16,
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  coldTitle: {
    color: theme.colors.warning,
    fontWeight: "800",
    fontSize: 13,
  },
  coldText: {
    marginTop: 3,
    fontSize: 12,
    color: theme.colors.muted,
  },
  footerWrap: {
    marginTop: 28,
    alignItems: "center",
    gap: 10,
    paddingBottom: 12,
  },
  footnote: {
    paddingHorizontal: 10,
    textAlign: "center",
    fontSize: 11,
    lineHeight: 16,
    color: theme.colors.muted,
  },
  brandBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "#E2E8F0",
  },
  brandBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#475569",
    letterSpacing: 0.3,
  },
  developer: {
    textAlign: "center",
    fontSize: 11,
    fontWeight: "600",
    color: theme.colors.muted,
  },
  toast: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 84,
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: "#0F172A",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    ...theme.shadow,
    elevation: 8,
  },
  toastDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#10B981",
  },
  toastText: {
    flex: 1,
    color: "white",
    fontWeight: "800",
    fontSize: 13,
  },
});
