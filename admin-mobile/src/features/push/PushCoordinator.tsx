import { useEffect, useRef } from "react";
import { router } from "expo-router";
import * as Notifications from "expo-notifications";
import { queryClient } from "@/services/query/queryClient";
import { useAuth } from "@/features/auth/AuthProvider";
import { pushService } from "./pushService";
import { pushTarget, targetHref, type PushTarget } from "./pushHelpers";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export function PushCoordinator() {
  const auth = useAuth();
  const pending = useRef<PushTarget | null>(null);
  const authStatus = useRef(auth.status);
  authStatus.current = auth.status;

  useEffect(() => {
    const routeOrDefer = (target: PushTarget) => {
      if (authStatus.current === "authenticated") {
        router.push(targetHref(target) as never);
      } else {
        pending.current = target;
      }
    };

    void pushService.configure();

    const received = Notifications.addNotificationReceivedListener(() => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "notifications"] });
      void queryClient.invalidateQueries({ queryKey: ["admin", "orders"] });
    });

    const response = Notifications.addNotificationResponseReceivedListener((r) =>
      routeOrDefer(pushTarget(r.notification.request.content.data as Record<string, unknown>))
    );

    void Notifications.getLastNotificationResponseAsync().then((r) => {
      if (r) {
        routeOrDefer(pushTarget(r.notification.request.content.data as Record<string, unknown>));
      }
    });

    return () => {
      received.remove();
      response.remove();
    };
  }, []);

  // Auto-request and register push notifications whenever Admin is authenticated
  useEffect(() => {
    if (auth.status === "authenticated") {
      void pushService.enable().catch(() => undefined);
    }
  }, [auth.status]);

  useEffect(() => {
    if (auth.status === "authenticated" && pending.current) {
      const target = pending.current;
      pending.current = null;
      router.push(targetHref(target) as never);
    }
  }, [auth.status]);

  return null;
}
