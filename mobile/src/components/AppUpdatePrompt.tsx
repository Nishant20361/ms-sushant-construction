import * as Application from "expo-application";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Alert, Linking, Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { publicApi } from "@/services/publicApi";
import { theme } from "@/theme";

function isDirectAndroidApkUrl(value: string): boolean {
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" && !url.username && !url.password && /\.apk$/i.test(url.pathname);
  } catch {
    return false;
  }
}

function installedBuildNumber(): number {
  const value = Number(Application.nativeBuildVersion);
  return Number.isSafeInteger(value) && value > 0 ? value : 0;
}

export function AppUpdatePrompt() {
  const [dismissedForSession, setDismissedForSession] = useState(false);
  const settings = useQuery({
    queryKey: ["android-update-config"],
    queryFn: ({ signal }) => publicApi.getSettings(signal),
    enabled: Platform.OS === "android",
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: "always",
    retry: 1,
  });
  const update = settings.data?.settings;
  const installedBuild = installedBuildNumber();
  const remoteBuild = Number(update?.androidLatestBuild ?? 0);
  const shouldShow = !dismissedForSession && !settings.isFetching && settings.isSuccess && Platform.OS === "android" && installedBuild > 0 && update?.androidUpdateEnabled === true && Boolean(update.androidLatestVersion.trim()) && Number.isSafeInteger(remoteBuild) && remoteBuild > installedBuild && isDirectAndroidApkUrl(update.androidApkUrl);

  const openUpdate = async () => {
    if (!update?.androidApkUrl) return;
    try {
      await Linking.openURL(update.androidApkUrl);
    } catch {
      Alert.alert("Update link unavailable", "The Android update link could not be opened. Please try again later.");
    }
  };

  return <Modal visible={shouldShow} transparent animationType="fade" onRequestClose={() => setDismissedForSession(true)}><View style={styles.backdrop}><View accessibilityViewIsModal style={styles.card}><Text style={styles.title}>Update Your App</Text><Text style={styles.message}>{update?.androidUpdateMessage.trim() || "A new version is available with improvements and bug fixes."}</Text><View style={styles.actions}><Pressable accessibilityRole="button" onPress={() => void openUpdate()} style={styles.primary}><Text style={styles.primaryText}>Update Now</Text></Pressable><Pressable accessibilityRole="button" onPress={() => setDismissedForSession(true)} style={styles.secondary}><Text style={styles.secondaryText}>Not Now</Text></Pressable></View></View></View></Modal>;
}

const styles = StyleSheet.create({ backdrop: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: "rgba(15, 23, 42, 0.52)" }, card: { width: "100%", maxWidth: 390, padding: 22, borderRadius: 20, backgroundColor: theme.colors.surface, ...theme.shadow }, title: { fontSize: 22, fontWeight: "900", color: theme.colors.text }, message: { marginTop: 9, fontSize: 14, lineHeight: 21, color: theme.colors.muted }, actions: { flexDirection: "row", gap: 10, marginTop: 22 }, primary: { flex: 1, minHeight: 46, alignItems: "center", justifyContent: "center", borderRadius: 12, backgroundColor: theme.colors.primary }, primaryText: { color: "white", fontWeight: "900" }, secondary: { flex: 1, minHeight: 46, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: theme.colors.primary, borderRadius: 12 }, secondaryText: { color: theme.colors.primaryDark, fontWeight: "900" } });
