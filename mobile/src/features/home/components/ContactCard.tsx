import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { SiteSettings } from "@/types/domain";
import { theme } from "@/theme";
import { businessDirectionsUrl, emailUrl, openExternalUrl, telephoneUrl } from "@/utils/externalLinks";

export function ContactCard({ settings, loading, error, onRetry }: { settings?: SiteSettings | null; loading: boolean; error: boolean; onRetry: () => void }) {
  const [actionError, setActionError] = useState("");
  const phone = settings?.phone?.trim() || settings?.businessMobile?.trim() || "";
  const email = settings?.email?.trim() || settings?.businessEmail?.trim() || "";
  const maps = businessDirectionsUrl(settings);
  const act = async (url: string) => setActionError((await openExternalUrl(url)) ? "" : "This action could not be opened. Check the configured contact details and try again.");

  if (loading && !settings) return <View style={[styles.card, styles.skeleton]}><View style={styles.skeletonLine} /><View style={styles.skeletonSmall} /></View>;
  if (error && !settings) return <Pressable accessibilityRole="button" onPress={onRetry} style={styles.card}><Text style={styles.title}>Contact details are temporarily unavailable.</Text><Text style={styles.retry}>Tap to retry</Text></Pressable>;
  return (
    <View style={styles.card}>
      <View style={styles.badgePill}>
        <Text style={styles.eyebrow}>💬 DIRECT SUPPORT</Text>
      </View>
      <Text style={styles.title}>Talk to MS Sushant Construction</Text>
      {settings?.address ? <Text style={styles.address}>{settings.address}</Text> : null}
      <View style={styles.actions}>
        {phone ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Call ${phone}`}
            onPress={() => void act(telephoneUrl(phone))}
            style={({ pressed }) => [styles.primary, pressed && styles.buttonPressed]}
          >
            <Text style={styles.primaryText}>📞  Call Now</Text>
          </Pressable>
        ) : null}
        {email ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Email ${email}`}
            onPress={() => void act(emailUrl(email))}
            style={({ pressed }) => [styles.secondary, pressed && styles.buttonPressed]}
          >
            <Text style={styles.secondaryText}>✉️  Email</Text>
          </Pressable>
        ) : null}
        {maps ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open business directions"
            onPress={() => void act(maps)}
            style={({ pressed }) => [styles.secondary, pressed && styles.buttonPressed]}
          >
            <Text style={styles.secondaryText}>📍  Directions</Text>
          </Pressable>
        ) : null}
      </View>
      {actionError ? <Text accessibilityRole="alert" style={styles.actionError}>{actionError}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 140,
    marginTop: 28,
    padding: 20,
    borderRadius: 22,
    backgroundColor: "#F0FDFA",
    borderWidth: 1.5,
    borderColor: "#CCFBF1",
    ...theme.shadow,
    elevation: 2,
  },
  skeleton: {
    justifyContent: "center",
  },
  skeletonLine: {
    width: "70%",
    height: 18,
    borderRadius: 9,
    backgroundColor: theme.colors.border,
  },
  skeletonSmall: {
    width: "45%",
    height: 12,
    marginTop: 10,
    borderRadius: 6,
    backgroundColor: theme.colors.border,
  },
  badgePill: {
    alignSelf: "flex-start",
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: 999,
    backgroundColor: "#CCFBF1",
  },
  eyebrow: {
    color: theme.colors.primaryDark,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.6,
  },
  title: {
    marginTop: 8,
    fontSize: 19,
    fontWeight: "900",
    color: theme.colors.text,
  },
  address: {
    marginTop: 6,
    fontSize: 12.5,
    lineHeight: 18,
    color: theme.colors.muted,
  },
  actions: {
    marginTop: 16,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  primary: {
    minHeight: 42,
    justifyContent: "center",
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: theme.colors.primary,
  },
  primaryText: {
    color: "white",
    fontSize: 13,
    fontWeight: "800",
  },
  secondary: {
    minHeight: 42,
    justifyContent: "center",
    paddingHorizontal: 14,
    borderWidth: 1.5,
    borderColor: "#CCFBF1",
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
  },
  secondaryText: {
    color: theme.colors.primaryDark,
    fontSize: 13,
    fontWeight: "800",
  },
  buttonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  retry: {
    marginTop: 8,
    color: theme.colors.primary,
    fontWeight: "700",
  },
  actionError: {
    marginTop: 10,
    color: theme.colors.danger,
    fontSize: 12,
  },
});
