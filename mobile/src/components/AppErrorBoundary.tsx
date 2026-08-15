import React, { Component, type ErrorInfo, type ReactNode } from "react";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { theme } from "@/theme";

interface Props { children: ReactNode }
interface State { failed: boolean }

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };
  static getDerivedStateFromError(): State { return { failed: true }; }
  componentDidCatch(error: Error, info: ErrorInfo) {
    if (__DEV__) console.error("[AppErrorBoundary]", error, info.componentStack);
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Something went wrong.</Text>
        <Text style={styles.message}>The app hit an unexpected problem. Your saved cart is safe.</Text>
        <Pressable accessibilityRole="button" style={styles.button} onPress={() => this.setState({ failed: false })}>
          <Text style={styles.buttonText}>Try again</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Go Home" style={styles.homeButton} onPress={() => { this.setState({ failed: false }); router.replace("/(tabs)"); }}>
          <Text style={styles.homeText}>Go Home</Text>
        </Pressable>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: theme.spacing.xl, backgroundColor: theme.colors.background },
  title: { fontSize: theme.typography.heading, fontWeight: "700", color: theme.colors.text },
  message: { marginTop: theme.spacing.sm, textAlign: "center", color: theme.colors.muted },
  button: { marginTop: theme.spacing.lg, minHeight: 48, justifyContent: "center", paddingHorizontal: theme.spacing.lg, borderRadius: theme.radius.md, backgroundColor: theme.colors.primary },
  buttonText: { color: "white", fontWeight: "700" },
  homeButton: { minHeight: 48, marginTop: theme.spacing.sm, justifyContent: "center", paddingHorizontal: theme.spacing.lg },
  homeText: { color: theme.colors.primary, fontWeight: "700" },
});
