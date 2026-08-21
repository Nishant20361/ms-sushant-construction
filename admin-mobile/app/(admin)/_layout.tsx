import { Redirect, Stack } from "expo-router";
import { Screen } from "@/components/Screen";
import { LoadingState } from "@/components/ui";
import { useAuth } from "@/features/auth/AuthProvider";
export default function AdminLayout() { const auth = useAuth(); if (auth.status === "unknown") return <Screen centered><LoadingState label="Checking secure session…" /></Screen>; if (auth.status !== "authenticated") return <Redirect href="/(auth)" />; return <Stack screenOptions={{ headerShown: false, animation: "fade" }} />; }
