import { useMutation,useQuery,useQueryClient } from "@tanstack/react-query";
import { adminQueryKeys } from "@/constants/queryKeys";
import { insightsService } from "./insightsService";
export const useAnalytics=()=>useQuery({queryKey:adminQueryKeys.analyticsBundle(),queryFn:({signal})=>insightsService.analytics(signal),staleTime:60_000});
export const useChart=(kind:string)=>useQuery({queryKey:adminQueryKeys.chart(kind),queryFn:({signal})=>insightsService.chart(kind,signal),staleTime:60_000});
export const useNotifications=(unreadOnly:boolean)=>useQuery({queryKey:adminQueryKeys.notificationList(unreadOnly),queryFn:({signal})=>insightsService.notifications(unreadOnly,signal),staleTime:15_000});
export function useMarkNotifications(){const qc=useQueryClient();return useMutation({mutationFn:(ids?:number[])=>insightsService.markRead(ids),onSuccess:()=>qc.invalidateQueries({queryKey:["admin","notifications"]})})}
export const useSalesReport=(query:string,enabled:boolean)=>useQuery({queryKey:adminQueryKeys.salesReport(query),queryFn:({signal})=>insightsService.salesReport(query,signal),enabled,staleTime:30_000});
