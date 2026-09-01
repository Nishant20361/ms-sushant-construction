import type { PropsWithChildren } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  View,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/theme";

interface Props extends PropsWithChildren {
  scroll?: boolean;
  keyboardAware?: boolean;
  centered?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  scrollProps?: ScrollViewProps;
}

export function Screen({
  children,
  scroll = true,
  keyboardAware = false,
  centered = false,
  contentStyle,
  scrollProps,
}: Props) {
  const { colors, spacing } = useTheme();
  const insets = useSafeAreaInsets();

  // Ensure top clearance on Android and iOS across all device punch-holes / notches
  const topInset = Math.max(
    insets.top,
    Platform.OS === "android" ? (StatusBar.currentHeight || 28) : 0,
    10
  );

  const body = scroll ? (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      automaticallyAdjustKeyboardInsets={true}
      showsVerticalScrollIndicator={false}
      {...scrollProps}
      contentContainerStyle={[
        styles.content,
        centered && styles.centered,
        { padding: spacing.lg, paddingBottom: keyboardAware ? 80 : spacing.lg },
        contentStyle,
      ]}
    >
      {children}
    </ScrollView>
  ) : (
    <View
      style={[
        styles.content,
        centered && styles.centered,
        { padding: spacing.lg },
        contentStyle,
      ]}
    >
      {children}
    </View>
  );

  return (
    <SafeAreaView
      edges={["left", "right", "bottom"]}
      style={[styles.safe, { backgroundColor: colors.background, paddingTop: topInset }]}
    >
      {keyboardAware ? (
        <KeyboardAvoidingView
          style={styles.safe}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 20 : 0}
        >
          {body}
        </KeyboardAvoidingView>
      ) : (
        body
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { flexGrow: 1 },
  centered: { justifyContent: "center" },
});
