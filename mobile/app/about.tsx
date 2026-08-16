import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Screen } from "@/components/Screen";
import { publicApi } from "@/services/publicApi";
import { queryKeys } from "@/services/queryKeys";
import { theme } from "@/theme";
import { emailUrl, googleMapsDirectionsUrl, openExternalUrl, telephoneUrl } from "@/utils/externalLinks";

export default function AboutScreen() {
  const [error, setError] = useState("");
  const query = useQuery({ queryKey: queryKeys.settings, queryFn: ({ signal }) => publicApi.getSettings(signal), staleTime: 30 * 60 * 1000 });
  const settings = query.data?.settings;
  const destination = settings?.address?.trim() || settings?.businessAddress?.trim() || "";
  const open = async (url: string) => setError((await openExternalUrl(url)) ? "" : "This action could not be opened. Check the configured contact details and try again.");
  return <Screen title="About & Contact" subtitle="Loaded from public site settings"><View style={styles.card}><Text style={styles.name}>{settings?.businessName || settings?.companyName || "Loading…"}</Text><Text style={styles.tagline}>{settings?.tagline}</Text>{settings?.phone ? <Pressable accessibilityRole="button" accessibilityLabel={`Call ${settings.phone}`} onPress={() => void open(telephoneUrl(settings.phone))} style={styles.action}><Text style={styles.actionText}>{settings.phone}</Text></Pressable> : null}{settings?.email ? <Pressable accessibilityRole="button" accessibilityLabel={`Email ${settings.email}`} onPress={() => void open(emailUrl(settings.email))} style={styles.action}><Text style={styles.actionText}>{settings.email}</Text></Pressable> : null}<Text style={styles.line}>{destination}</Text>{destination ? <Pressable accessibilityRole="button" accessibilityLabel="Open directions" onPress={() => void open(googleMapsDirectionsUrl(destination))} style={styles.action}><Text style={styles.actionText}>Open directions</Text></Pressable> : null}{error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}</View></Screen>;
}

const styles = StyleSheet.create({ card: { padding: 18, borderRadius: 12, backgroundColor: theme.colors.surface, ...theme.shadow }, name: { fontSize: 20, fontWeight: "800", color: theme.colors.text }, tagline: { marginTop: 6, color: theme.colors.muted }, line: { marginTop: 14, color: theme.colors.text }, action: { minHeight: 48, justifyContent: "center", marginTop: 7 }, actionText: { color: theme.colors.primary, fontWeight: "700" }, error: { marginTop: 10, color: theme.colors.danger } });
