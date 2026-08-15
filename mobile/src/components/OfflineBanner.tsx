import { useNetInfo } from "@react-native-community/netinfo";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { theme } from "@/theme";

export function OfflineBanner() {
  const network = useNetInfo();
  const offline = network.isConnected === false || (network.isConnected === true && network.isInternetReachable === false);
  if (!offline) return null;
  return <SafeAreaView edges={["top"]} style={styles.safe}><View accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.banner}><Text style={styles.text}>You're offline. Showing available saved data.</Text></View></SafeAreaView>;
}
const styles = StyleSheet.create({ safe: { backgroundColor: theme.colors.warning }, banner: { minHeight: 36, justifyContent: "center", paddingHorizontal: 16, paddingVertical: 6 }, text: { color: "white", textAlign: "center", fontWeight: "600" } });
