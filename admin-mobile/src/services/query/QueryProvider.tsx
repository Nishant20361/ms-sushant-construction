import { useEffect, type PropsWithChildren } from "react";
import { AppState } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import { focusManager, onlineManager, QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./queryClient";

export function QueryProvider({ children }: PropsWithChildren) {
  useEffect(() => {
    const appState = AppState.addEventListener("change", state => focusManager.setFocused(state === "active"));
    const network = NetInfo.addEventListener(state => onlineManager.setOnline(state.isConnected !== false && state.isInternetReachable !== false));
    return () => { appState.remove(); network(); };
  }, []);
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
