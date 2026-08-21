import { useQuery } from "@tanstack/react-query";
import { adminQueryKeys } from "@/constants/queryKeys";
import { dashboardService } from "./dashboardService";
import { shouldRetryDashboard } from "./queryPolicy";
export function useDashboardOverview() { return useQuery({ queryKey: adminQueryKeys.dashboard(), queryFn: ({ signal }) => dashboardService.getOverview(signal), staleTime: 60_000, retry: shouldRetryDashboard }); }
export function useNotificationSummary() { return useQuery({ queryKey: adminQueryKeys.notifications(1), queryFn: ({ signal }) => dashboardService.getNotificationSummary(signal), staleTime: 60_000, retry: shouldRetryDashboard }); }
