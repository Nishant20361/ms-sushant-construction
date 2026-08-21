import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminQueryKeys } from "@/constants/queryKeys";
import { ordersService } from "./ordersService";
import type { OrderFilters } from "./types";
export const useOrders=(filters:OrderFilters)=>useInfiniteQuery({queryKey:adminQueryKeys.orderList(filters),queryFn:({pageParam,signal})=>ordersService.list(filters,pageParam,signal),initialPageParam:1,getNextPageParam:last=>last.page<last.pages?last.page+1:undefined});
export const useOrder=(id:number)=>useQuery({queryKey:adminQueryKeys.orderDetail(id),queryFn:({signal})=>ordersService.detail(id,signal),enabled:id>0});
export function useOrderMutations(id:number){const q=useQueryClient();const refresh=async()=>{await Promise.all([q.invalidateQueries({queryKey:adminQueryKeys.orders()}),q.invalidateQueries({queryKey:adminQueryKeys.dashboard()})])};return{status:useMutation({mutationFn:(status:Parameters<typeof ordersService.status>[1])=>ordersService.status(id,status),onSuccess:refresh}),edit:useMutation({mutationFn:(items:{productId:number;quantity:number}[])=>ordersService.edit(id,items),onSuccess:refresh})}}
export const useOrderProducts=(search:string,enabled=true)=>useQuery({queryKey:adminQueryKeys.orderProducts(search),queryFn:({signal})=>ordersService.products(search,signal),enabled,staleTime:60_000});
