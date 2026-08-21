import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as Print from "expo-print";
import { adminApiClient } from "@/services/api/client";
import { normalizeNotificationPage, normalizePoints, normalizeSalesReport } from "./normalize";
import { safeExportName } from "./helpers";
import type { SalesPeriod } from "./types";
export const insightsService={
 async sharePdf(html:string,filename:string,title:string){if(!await Sharing.isAvailableAsync())throw new Error("Document sharing is unavailable on this device.");const generated=await Print.printToFileAsync({html});const source=new File(generated.uri),destination=new File(Paths.cache,filename);if(destination.exists)destination.delete();source.move(destination);await Sharing.shareAsync(destination.uri,{mimeType:"application/pdf",dialogTitle:title});return destination.uri},
 async analytics(signal?:AbortSignal){const [overview,customers,products,categories,payments]=await Promise.all(["overview","top-customers?limit=10","top-products","categories","payment-modes"].map(path=>adminApiClient.request<unknown>(`/admin/analytics/${path}`,{signal})));return{overview,customers,products,categories,payments}},
 async chart(kind:string,signal?:AbortSignal){return normalizePoints(await adminApiClient.request(`/admin/analytics/charts?kind=${encodeURIComponent(kind)}`,{signal}))},
 async notifications(unreadOnly:boolean,signal?:AbortSignal){return normalizeNotificationPage(await adminApiClient.request(`/admin/notifications?limit=100&unreadOnly=${unreadOnly}`,{signal}))},
 async markRead(ids?:number[]){return adminApiClient.request<{ok:boolean;unreadCount:number}>("/admin/notifications/read",{method:"POST",body:ids?{ids}:{all:true}})},
 async salesReport(query:string,signal?:AbortSignal){return normalizeSalesReport(await adminApiClient.request(`/admin/reports/data?${query}`,{signal}))},
 async dueReport(search:string,signal?:AbortSignal){return adminApiClient.request<unknown>(`/admin/analytics/customer-due-report?limit=50&search=${encodeURIComponent(search)}`,{signal})},
 async statement(mobile:string,signal?:AbortSignal){return adminApiClient.request<unknown>(`/admin/analytics/customer-statement/${encodeURIComponent(mobile)}`,{signal})},
 async products(signal?:AbortSignal){return adminApiClient.request<unknown>("/admin/analytics/products",{signal})},
 async productHistory(id:number,signal?:AbortSignal){return adminApiClient.request<unknown>(`/admin/analytics/product-history/${id}`,{signal})},
 async exportSales(period:SalesPeriod,query:string,ext:"csv"|"xlsx"){const format=ext==="xlsx"?"excel":"csv";const bytes=await adminApiClient.request<ArrayBuffer>(`/admin/reports/sales/${period}/${format}?${query}`,{responseType:"arrayBuffer",timeoutMs:60_000});const file=new File(Paths.cache,safeExportName(period,ext));file.create({overwrite:true,intermediates:true});file.write(new Uint8Array(bytes));if(!await Sharing.isAvailableAsync())throw new Error("Sharing is not available on this device");await Sharing.shareAsync(file.uri,{mimeType:ext==="csv"?"text/csv":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",dialogTitle:`Share ${period} sales report`});return file.uri},
 async exportDue(ext:"csv"|"xlsx",search:string){const bytes=await adminApiClient.request<ArrayBuffer>(`/admin/analytics/customer-due-report?limit=100000&search=${encodeURIComponent(search)}&export=${ext}`,{responseType:"arrayBuffer",timeoutMs:60_000});const file=new File(Paths.cache,`customer-due-report-${new Date().toISOString().slice(0,10)}.${ext}`);file.create({overwrite:true,intermediates:true});file.write(new Uint8Array(bytes));await Sharing.shareAsync(file.uri,{mimeType:ext==="csv"?"text/csv":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"});return file.uri}
};
