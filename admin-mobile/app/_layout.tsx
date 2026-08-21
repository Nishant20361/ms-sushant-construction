import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "@/features/auth/AuthProvider";
import { QueryProvider } from "@/services/query/QueryProvider";
import { ThemeProvider, useTheme } from "@/theme";
import { PushCoordinator } from "@/features/push/PushCoordinator";

function AppStack() {
  const { colors } = useTheme();
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background }, animation: "fade" }} />;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider><QueryProvider><AuthProvider><PushCoordinator/><AppStack /></AuthProvider></QueryProvider></ThemeProvider>
    </SafeAreaProvider>
  );
}
