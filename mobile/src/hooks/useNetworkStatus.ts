import { useEffect } from "react";
import { AppState, Platform } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import { focusManager, onlineManager } from "@tanstack/react-query";

export function useNetworkStatus(): void {
  useEffect(() => {
    const unsubscribeNetwork = NetInfo.addEventListener((state) => {
    onlineManager.setOnline(Boolean(state.isConnected && state.isInternetReachable !== false));
    });
    const subscription = AppState.addEventListener("change", (state) => {
      if (Platform.OS !== "web") focusManager.setFocused(state === "active");
    });
    return () => { unsubscribeNetwork(); subscription.remove(); };
  }, []);
}
