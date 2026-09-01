import React, { useEffect, useState } from "react";
import {
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useNetInfo } from "@react-native-community/netinfo";
import { AppText } from "@/components/AppText";
import { Screen } from "@/components/Screen";
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  FilterChip,
  IconButton,
  LoadingState,
} from "@/components/ui";
import { useTheme } from "@/theme";
import { formatDateTime } from "@/utils/formatters";
import { notificationCopy } from "./helpers";
import {
  pushTarget,
  targetHref,
} from "@/features/push/pushHelpers";
import { useMarkNotifications, useNotifications } from "./useInsights";
import type { NotificationItem } from "./types";

export function NotificationsScreen() {
  const t = useTheme();
  const net = useNetInfo();
  const [unreadOnly, setUnreadOnly] = useState(false);
  const q = useNotifications(unreadOnly);
  const mark = useMarkNotifications();
  const offline = net.isConnected === false || net.isInternetReachable === false;

  // Auto-mark all notifications as read when opening notifications screen
  useEffect(() => {
    if (q.data?.unreadCount && q.data.unreadCount > 0 && !mark.isPending) {
      mark.mutate(undefined);
    }
  }, [q.data?.unreadCount]);

  const handleOpenNotification = async (n: NotificationItem) => {
    if (!n.read) {
      await mark.mutateAsync([n.id]).catch(() => undefined);
    }
    const target = pushTarget({
      type: n.type,
      orderId: n.orderId,
      productId: n.productId,
    });
    router.push(targetHref(target) as never);
  };

  const getIconMeta = (type: string) => {
    switch (type) {
      case "NEW_ORDER":
        return {
          icon: "receipt" as const,
          color: "#16a34a",
          bg: "rgba(22, 163, 74, 0.12)",
        };
      case "PAYMENT_RECEIVED":
        return {
          icon: "cash" as const,
          color: "#0284c7",
          bg: "rgba(2, 132, 199, 0.12)",
        };
      case "LOW_STOCK":
      case "OUT_OF_STOCK":
        return {
          icon: "alert-circle" as const,
          color: "#d97706",
          bg: "rgba(217, 119, 6, 0.12)",
        };
      default:
        return {
          icon: "notifications" as const,
          color: t.colors.brand,
          bg: "rgba(15, 118, 110, 0.12)",
        };
    }
  };

  const notifications = q.data?.notifications ?? [];
  const unreadCount = q.data?.unreadCount ?? 0;

  return (
    <Screen
      scrollProps={{
        refreshControl: (
          <RefreshControl
            refreshing={q.isRefetching}
            onRefresh={() => void q.refetch()}
            tintColor={t.colors.brand}
          />
        ),
      }}
      contentStyle={[s.content, { gap: 14, paddingBottom: 40 }]}
    >
      {/* Top Header */}
      <View style={s.topNav}>
        <IconButton
          icon="arrow-back"
          label="Back"
          onPress={() => router.back()}
        />
        <View style={s.flex}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <AppText role="pageTitle">Notifications</AppText>
            {unreadCount > 0 && (
              <View style={[s.badgePill, { backgroundColor: t.colors.danger }]}>
                <AppText style={s.badgeText}>{unreadCount}</AppText>
              </View>
            )}
          </View>
          <AppText style={{ color: t.colors.textSecondary, fontSize: 12 }}>
            Recent alerts & business notifications (3 days history)
          </AppText>
        </View>
      </View>

      {offline && (
        <Card style={{ backgroundColor: t.colors.warningSoft }}>
          <AppText style={{ color: t.colors.warning }}>
            Offline · showing cached results when available.
          </AppText>
        </Card>
      )}

      {/* Filter & Action Row */}
      <View style={s.between}>
        <View style={s.row}>
          <FilterChip
            label="All"
            selected={!unreadOnly}
            onPress={() => setUnreadOnly(false)}
          />
          <FilterChip
            label={unreadCount > 0 ? `Unread (${unreadCount})` : "Unread"}
            selected={unreadOnly}
            onPress={() => setUnreadOnly(true)}
          />
        </View>
        {unreadCount > 0 && (
          <Button
            title="Mark all read"
            variant="ghost"
            disabled={mark.isPending}
            onPress={() => mark.mutate(undefined)}
          />
        )}
      </View>

      {/* Notifications List */}
      {q.isPending && !q.data ? (
        <LoadingState label="Loading notifications…" />
      ) : q.error && !q.data ? (
        <ErrorState
          description="Notifications could not be loaded."
          onRetry={() => void q.refetch()}
        />
      ) : notifications.length > 0 ? (
        <View style={{ gap: 10 }}>
          {notifications.map((n) => {
            const copy = notificationCopy(n);
            const meta = getIconMeta(n.type);

            return (
              <Pressable
                key={n.id}
                onPress={() => void handleOpenNotification(n)}
                style={({ pressed }) => [
                  s.notificationCard,
                  {
                    backgroundColor: t.colors.surface,
                    borderColor: !n.read
                      ? "rgba(22, 163, 74, 0.45)"
                      : t.colors.border,
                  },
                  !n.read && s.unreadCardHighlight,
                  pressed && { opacity: 0.88, transform: [{ scale: 0.99 }] },
                ]}
              >
                {/* Category Icon Badge */}
                <View
                  style={[
                    s.iconContainer,
                    { backgroundColor: meta.bg },
                  ]}
                >
                  <Ionicons
                    name={meta.icon}
                    size={22}
                    color={meta.color}
                  />
                </View>

                {/* Content */}
                <View style={s.flex}>
                  <View style={s.between}>
                    <AppText
                      role="bodyStrong"
                      numberOfLines={1}
                      style={{
                        flex: 1,
                        fontSize: 15,
                        color: !n.read ? t.colors.text : t.colors.textSecondary,
                      }}
                    >
                      {copy.title}
                    </AppText>
                    {!n.read && (
                      <View style={s.newPill}>
                        <View style={s.newDot} />
                        <AppText style={s.newText}>New</AppText>
                      </View>
                    )}
                  </View>

                  <AppText
                    style={{
                      color: t.colors.text,
                      fontSize: 13,
                      lineHeight: 18,
                      marginTop: 2,
                    }}
                  >
                    {copy.message}
                  </AppText>

                  <View style={s.cardFooter}>
                    <Ionicons
                      name="time-outline"
                      size={13}
                      color={t.colors.textMuted}
                    />
                    <AppText
                      role="caption"
                      style={{ color: t.colors.textMuted, fontSize: 11 }}
                    >
                      {formatDateTime(n.createdAt)}
                    </AppText>
                  </View>
                </View>

                {/* Right Arrow Chevron */}
                <View style={s.chevron}>
                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color={t.colors.textMuted}
                  />
                </View>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <EmptyState
          title={unreadOnly ? "You're all caught up" : "No recent notifications"}
          description={
            unreadOnly
              ? "There are no unread alerts at this time."
              : "Business alerts and notifications expire automatically after 3 days."
          }
        />
      )}
    </Screen>
  );
}

const s = StyleSheet.create({
  content: {
    width: "100%",
    maxWidth: 680,
    alignSelf: "center",
  },
  topNav: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 4,
  },
  between: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  flex: {
    flex: 1,
  },
  badgePill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  badgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "800",
  },
  notificationCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  unreadCardHighlight: {
    borderLeftWidth: 4,
    borderLeftColor: "#16a34a",
    backgroundColor: "rgba(22, 163, 74, 0.04)",
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  newPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(22, 163, 74, 0.15)",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
  },
  newDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#16a34a",
  },
  newText: {
    color: "#16a34a",
    fontSize: 10,
    fontWeight: "800",
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
  },
  chevron: {
    paddingLeft: 4,
    justifyContent: "center",
    alignItems: "center",
  },
});
