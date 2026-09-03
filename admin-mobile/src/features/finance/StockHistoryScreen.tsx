import { memo, useCallback, useMemo, useState } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { AppText } from "@/components/AppText";
import { Screen } from "@/components/Screen";
import {
  Button,
  EmptyState,
  ErrorState,
  FilterChip,
  IconButton,
  LoadingState,
} from "@/components/ui";
import { useProduct, useProductStockHistory } from "@/features/products/useProducts";
import type { StockHistoryItem } from "@/features/products/types";
import { useTheme } from "@/theme";
import { formatDateTime, formatINR } from "@/utils/formatters";

type FilterType = "ALL" | "ADD" | "REMOVE" | "ORDER";

interface StockHistoryCardProps {
  item: StockHistoryItem;
  unit: string;
}

const StockHistoryCard = memo(function StockHistoryCard({
  item,
  unit,
}: StockHistoryCardProps) {
  const t = useTheme();
  const isAdd = item.type === "ADD";
  const isRemove = item.type === "REMOVE" || item.type === "SET";
  const isOrder = item.type === "ORDER";

  const cardBg = isAdd ? "#f0fdf4" : isOrder ? "#f0f9ff" : "#fef2f2";
  const cardBorder = isAdd ? "#86efac" : isOrder ? "#93c5fd" : "#fca5a5";
  const iconName = isAdd ? "arrow-down-circle" : isOrder ? "cart" : "arrow-up-circle";
  const iconColor = isAdd ? "#16a34a" : isOrder ? "#0284c7" : "#dc2626";
  const typeTitle = isAdd
    ? "🟢 + स्टॉक आया (Stock Added)"
    : isOrder
    ? "🔵 🛒 ग्राहक को बेचा (Customer Order)"
    : "🔴 - स्टॉक घटाया (Stock Removed)";

  return (
    <View
      style={[
        s.card,
        {
          borderColor: cardBorder,
          backgroundColor: cardBg,
        },
      ]}
    >
      {/* Header Row */}
      <View style={s.cardHeaderRow}>
        <View style={s.cardHeaderTitleWrap}>
          <Ionicons name={iconName as any} size={18} color={iconColor} />
          <AppText style={[s.cardHeaderTitle, { color: iconColor }]} numberOfLines={1}>
            {typeTitle}
          </AppText>
        </View>
        <View style={[s.badge, { borderColor: cardBorder }]}>
          <AppText style={[s.badgeText, { color: iconColor }]}>
            {isAdd ? "+" : "-"}{item.quantity} {unit}
          </AppText>
        </View>
      </View>

      {/* Customer Order Details */}
      {isOrder && (
        <View style={s.orderDetailBox}>
          <View style={s.rowBetween}>
            <AppText style={s.customerNameText}>
              👤 {item.customerName || "Customer"}
            </AppText>
            {item.orderNumber && (
              <View style={s.orderTag}>
                <AppText style={s.orderTagText}>
                  #{item.orderNumber}
                </AppText>
              </View>
            )}
          </View>
          {item.customerMobile && (
            <AppText role="caption" style={s.customerMobileText}>
              📞 मोबाइल: {item.customerMobile}
            </AppText>
          )}
        </View>
      )}

      {/* Stock Transition Box */}
      {item.oldStock !== undefined && item.newStock !== undefined && (
        <View style={s.transitionBox}>
          <AppText style={{ fontSize: 12, color: t.colors.textSecondary, fontWeight: "600" }}>
            स्टॉक:
          </AppText>
          <AppText style={{ fontSize: 12, fontWeight: "800", color: t.colors.text }}>
            {item.oldStock} {unit}
          </AppText>
          <AppText style={{ fontSize: 12, fontWeight: "900", color: iconColor }}>
            ➔
          </AppText>
          <AppText style={{ fontSize: 12, fontWeight: "900", color: iconColor }}>
            {item.newStock} {unit}
          </AppText>
        </View>
      )}

      {/* Reason / Details */}
      {item.reason && !isOrder && (
        <View style={s.rowAlign}>
          <AppText style={{ fontSize: 12, color: "#1e293b", fontWeight: "600" }}>
            📌 कारण: <AppText style={{ fontWeight: "700" }}>{item.reason}</AppText>
          </AppText>
        </View>
      )}

      {item.supplier && (
        <AppText role="caption" style={{ color: "#334155", fontWeight: "600" }}>
          🏢 सप्लायर: <AppText style={{ fontWeight: "700" }}>{item.supplier}</AppText>
        </AppText>
      )}

      {item.purchaseRate !== undefined && item.purchaseRate !== null && item.purchaseRate > 0 && (
        <AppText role="caption" style={{ color: "#15803d", fontWeight: "700" }}>
          💰 खरीद दर: {formatINR(item.purchaseRate)} / {unit}
        </AppText>
      )}

      {item.note && !isOrder && (
        <AppText role="caption" style={{ color: "#475569", fontStyle: "italic" }}>
          📝 नोट: {item.note}
        </AppText>
      )}

      {/* Footer Time & Admin */}
      <View style={s.cardFooter}>
        <View style={s.rowAlign}>
          <Ionicons name="time-outline" size={13} color="#64748b" />
          <AppText style={s.footerTimeText}>
            {formatDateTime(item.createdAt)}
          </AppText>
        </View>
        {item.adminUsername && (
          <AppText role="caption" style={s.footerAdminText}>
            दर्जकर्ता: {item.adminUsername}
          </AppText>
        )}
      </View>
    </View>
  );
});

export function StockHistoryScreen({ productId }: { productId: number }) {
  const t = useTheme();
  const [filter, setFilter] = useState<FilterType>("ALL");
  const [refreshing, setRefreshing] = useState(false);

  const isValidId = Number.isInteger(productId) && productId > 0;
  const productQ = useProduct(isValidId ? productId : 0);
  const historyQ = useProductStockHistory(isValidId ? productId : 0);

  const handleRefresh = useCallback(async () => {
    if (!isValidId) return;
    setRefreshing(true);
    try {
      await Promise.all([historyQ.refetch(), productQ.refetch()]);
    } finally {
      setRefreshing(false);
    }
  }, [isValidId, historyQ, productQ]);

  const items = useMemo(() => {
    const raw = (historyQ.data as any)?.history;
    return Array.isArray(raw) ? (raw as StockHistoryItem[]) : [];
  }, [historyQ.data]);

  const filteredItems = useMemo(() => {
    if (filter === "ALL") return items;
    if (filter === "REMOVE") {
      return items.filter((item) => item.type === "REMOVE" || item.type === "SET");
    }
    return items.filter((item) => item.type === filter);
  }, [items, filter]);

  const productName =
    productQ.data?.name || (historyQ.data as any)?.productName || `उत्पाद #${productId}`;
  const categoryName = productQ.data?.category?.name || "General";
  const unit = productQ.data?.unit || (historyQ.data as any)?.unit || "इकाई";
  const currentStock =
    productQ.data?.stock ?? (historyQ.data as any)?.currentStock ?? 0;

  const stockStatusColor =
    currentStock <= 0 ? "#dc2626" : currentStock <= 10 ? "#d97706" : "#16a34a";
  const stockBadgeBg =
    currentStock <= 0 ? "#fee2e2" : currentStock <= 10 ? "#fef3c7" : "#dcfce7";

  const renderItem = useCallback(
    ({ item }: { item: StockHistoryItem }) => (
      <StockHistoryCard item={item} unit={unit} />
    ),
    [unit]
  );

  const renderHeader = useMemo(() => {
    return (
      <View style={s.headerWrap}>
        {/* Product Summary Card */}
        <View
          style={[
            s.summaryCard,
            {
              backgroundColor: t.colors.surfaceElevated,
              borderColor: t.colors.border,
            },
          ]}
        >
          <View style={{ flex: 1, paddingRight: 10 }}>
            <AppText role="bodyStrong" numberOfLines={2} style={{ fontSize: 16 }}>
              {productName}
            </AppText>
            <View style={[s.rowAlign, { marginTop: 4, gap: 4 }]}>
              <Ionicons name="folder-outline" size={13} color={t.colors.textSecondary} />
              <AppText role="caption" style={{ color: t.colors.textSecondary }}>
                {categoryName}
              </AppText>
              <AppText role="caption" style={{ color: t.colors.textMuted }}>
                · इकाई: {unit}
              </AppText>
            </View>
          </View>

          <View
            style={[
              s.currentStockBox,
              { backgroundColor: stockBadgeBg, borderColor: stockStatusColor },
            ]}
          >
            <AppText role="caption" style={{ color: stockStatusColor, fontSize: 10, fontWeight: "700" }}>
              वर्तमान स्टॉक
            </AppText>
            <AppText style={{ fontWeight: "900", fontSize: 18, color: stockStatusColor, marginTop: 1 }}>
              {currentStock} {unit}
            </AppText>
          </View>
        </View>

        {/* Filter Chips Horizontal Scroller */}
        <View style={s.filterSection}>
          <AppText role="caption" style={{ color: t.colors.textMuted, fontWeight: "700", marginBottom: 2 }}>
            प्रकार के अनुसार फ़िल्टर (Filter by Type):
          </AppText>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.filterScrollContent}
          >
            <FilterChip
              label={`सभी (${items.length})`}
              selected={filter === "ALL"}
              onPress={() => setFilter("ALL")}
            />
            <FilterChip
              label="🟢 + आया (Stock In)"
              selected={filter === "ADD"}
              onPress={() => setFilter("ADD")}
            />
            <FilterChip
              label="🔴 - घटाया (Stock Out)"
              selected={filter === "REMOVE"}
              onPress={() => setFilter("REMOVE")}
            />
            <FilterChip
              label="🔵 🛒 बिक्री (Orders)"
              selected={filter === "ORDER"}
              onPress={() => setFilter("ORDER")}
            />
          </ScrollView>
        </View>

        {/* Section Title */}
        <View style={s.timelineHeader}>
          <AppText style={{ fontSize: 14, fontWeight: "800", color: t.colors.text }}>
            📜 गतिविधि विवरण (Movement Timeline)
          </AppText>
          <AppText role="caption" style={{ color: t.colors.textMuted }}>
            {filteredItems.length} रिकॉर्ड्स
          </AppText>
        </View>
      </View>
    );
  }, [
    t,
    productName,
    categoryName,
    unit,
    currentStock,
    stockBadgeBg,
    stockStatusColor,
    items.length,
    filter,
    filteredItems.length,
  ]);

  const renderEmpty = useCallback(() => {
    if (historyQ.isPending) return null;
    return (
      <View style={{ paddingTop: 24, paddingBottom: 32 }}>
        <EmptyState
          title="कोई गतिविधि नहीं मिली"
          description="इस फ़िल्टर श्रेणी में अभी तक कोई स्टॉक मूवमेंट दर्ज नहीं है।"
        />
      </View>
    );
  }, [historyQ.isPending]);

  if (!isValidId) {
    return (
      <Screen scroll={false} centered>
        <ErrorState
          title="अमान्य उत्पाद (Invalid Product)"
          description="उत्पाद आईडी मान्य नहीं है। कृपया खाताबुक गोदाम स्टॉक से पुनः प्रयास करें।"
        />
        <Button
          title="वापस जाएँ (Go Back)"
          variant="outline"
          onPress={() => router.back()}
          style={{ marginTop: 14, alignSelf: "center" }}
        />
      </Screen>
    );
  }

  if (historyQ.isPending && !historyQ.data) {
    return (
      <Screen scroll={false} centered>
        <LoadingState label="स्टॉक इतिहास लोड हो रहा है…" />
      </Screen>
    );
  }

  if (historyQ.isError && !historyQ.data) {
    return (
      <Screen scroll={false} centered>
        <ErrorState
          title="इतिहास लोड करने में समस्या"
          description={historyQ.error?.message ?? "स्टॉक इतिहास लोड नहीं हो सका"}
          onRetry={() => historyQ.refetch()}
        />
        <Button
          title="वापस जाएँ (Go Back)"
          variant="outline"
          onPress={() => router.back()}
          style={{ marginTop: 14, alignSelf: "center" }}
        />
      </Screen>
    );
  }

  return (
    <Screen scroll={false} contentStyle={{ padding: 0 }}>
      {/* Top Fixed Header */}
      <View
        style={[
          s.topHeader,
          {
            borderBottomColor: t.colors.border,
            backgroundColor: t.colors.surface,
          },
        ]}
      >
        <IconButton
          icon="arrow-back"
          label="पीछे जाएँ"
          onPress={() => router.back()}
        />
        <View style={s.topHeaderTitleWrap}>
          <AppText role="pageTitle" numberOfLines={1} style={{ fontSize: 17 }}>
            स्टॉक इतिहास (Stock History)
          </AppText>
          <AppText role="caption" numberOfLines={1} style={{ color: t.colors.textSecondary }}>
            {productName}
          </AppText>
        </View>
        <IconButton
          icon="refresh"
          label="ताज़ा करें"
          onPress={handleRefresh}
        />
      </View>

      {/* Primary Vertical Scroller: FlatList */}
      <FlatList
        data={filteredItems}
        keyExtractor={(item, index) => String(item.id ?? `${item.type}-${index}`)}
        renderItem={renderItem}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        showsVerticalScrollIndicator={true}
        contentContainerStyle={s.listContent}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        updateCellsBatchingPeriod={50}
        windowSize={10}
        removeClippedSubviews={Platform.OS === "android"}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        keyboardShouldPersistTaps="handled"
        style={{ flex: 1 }}
      />
    </Screen>
  );
}

const s = StyleSheet.create({
  topHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    gap: 8,
  },
  topHeaderTitleWrap: {
    flex: 1,
    paddingHorizontal: 4,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 48,
    gap: 12,
  },
  headerWrap: {
    gap: 12,
    marginBottom: 4,
  },
  summaryCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  currentStockBox: {
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
  },
  filterSection: {
    gap: 6,
  },
  filterScrollContent: {
    gap: 8,
    paddingVertical: 2,
  },
  timelineHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 6,
  },
  card: {
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 12,
    gap: 8,
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardHeaderTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
    paddingRight: 6,
  },
  cardHeaderTitle: {
    fontWeight: "800",
    fontSize: 13,
  },
  badge: {
    backgroundColor: "#ffffff",
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  badgeText: {
    fontWeight: "900",
    fontSize: 14,
  },
  orderDetailBox: {
    backgroundColor: "#ffffff",
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#bfdbfe",
    gap: 4,
  },
  customerNameText: {
    color: "#0369a1",
    fontSize: 13,
    fontWeight: "800",
  },
  orderTag: {
    backgroundColor: "#e0f2fe",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  orderTagText: {
    color: "#0369a1",
    fontSize: 11,
    fontWeight: "700",
  },
  customerMobileText: {
    color: "#475569",
    fontWeight: "600",
  },
  transitionBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.75)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 8,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 2,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.06)",
  },
  footerTimeText: {
    color: "#334155",
    fontSize: 11,
    fontWeight: "700",
  },
  footerAdminText: {
    color: "#64748b",
    fontSize: 10,
    fontWeight: "600",
  },
  rowAlign: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
});
