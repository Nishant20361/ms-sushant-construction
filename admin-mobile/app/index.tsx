import { Redirect } from "expo-router";
import { LoadingState } from "@/components/ui";
import { Screen } from "@/components/Screen";
import { useAuth } from "@/features/auth/AuthProvider";
export default function EntryRoute() { const { status } = useAuth(); if (status === "unknown") return <Screen centered><LoadingState label="Checking secure session…" /></Screen>; return <Redirect href={status === "authenticated" ? "/(admin)" : "/(auth)"} />; }
