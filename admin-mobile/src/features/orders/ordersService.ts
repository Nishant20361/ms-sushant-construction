import { adminApiClient } from "@/services/api/client";
import { normalizeOrder, normalizeOrdersPage, normalizeProduct } from "./normalize";
import type { OrderFilters, OrderStatus } from "./types";
import { serializeOrderQuery } from "./helpers";
export const ordersService={
 list:async(filters:OrderFilters,page:number,signal?:AbortSignal)=>normalizeOrdersPage(await adminApiClient.request(`/admin/orders?${serializeOrderQuery({...filters,page,limit:20})}`,{signal})),
 detail:async(id:number,signal?:AbortSignal)=>{const r=await adminApiClient.request<{order:unknown}>(`/admin/orders/${id}`,{signal});return normalizeOrder(r.order)},
 status:async(id:number,status:OrderStatus)=>{const r=await adminApiClient.request<{order:unknown}>(`/admin/orders/${id}/status`,{method:"PATCH",body:{status}});return normalizeOrder(r.order)},
 edit:async(id:number,items:{productId:number;quantity:number}[])=>{const r=await adminApiClient.request<{order:unknown}>(`/admin/orders/${id}/edit`,{method:"PATCH",body:{items}});return normalizeOrder(r.order)},
 products:async(search:string,signal?:AbortSignal)=>{const r=await adminApiClient.request<{products:unknown[]}>(`/admin/products?${serializeOrderQuery({search,active:"true",page:1,limit:30})}`,{signal});return Array.isArray(r.products)?r.products.map(normalizeProduct):[]}
};
