import type { OrderStatus } from "./types";
export const label=(v:string)=>v.toLowerCase().split("_").map(x=>x[0]?.toUpperCase()+x.slice(1)).join(" ");
export const statusTone=(v:string)=>v==="DELIVERED"?"success":v==="CANCELLED"?"danger":v==="PENDING"?"warning":"info" as const;
export const paymentTone=(v:string)=>v==="PAID"?"success":v==="DUE"?"danger":"warning" as const;
export function validDateRange(from:string,to:string){const iso=/^\d{4}-\d{2}-\d{2}$/;if(from&&!iso.test(from))return"From date must use YYYY-MM-DD.";if(to&&!iso.test(to))return"To date must use YYYY-MM-DD.";if(from&&to&&from>to)return"From date cannot be after To date.";return null}
export const needsWhole=(unit:string)=>["bag","piece"].includes(unit.trim().toLowerCase());
export const statusWarning=(oldStatus:string,next:OrderStatus)=>next==="CANCELLED"&&oldStatus!=="CANCELLED"?"Cancelling restores every item to inventory.":oldStatus==="CANCELLED"&&next!=="CANCELLED"?"Reactivating reserves stock again and can fail if inventory is insufficient.":`Change this order to ${label(next)}?`;
export function mergeUniqueOrders<T extends {id:number}>(pages:T[][]){const seen=new Set<number>();return pages.flatMap(page=>page.filter(item=>item.id>0&&!seen.has(item.id)&&!!seen.add(item.id)))}
export const serializeOrderQuery=(values:Record<string,string|number|undefined>)=>{const p=new URLSearchParams();Object.entries(values).forEach(([k,v])=>{if(v!==undefined&&v!=="")p.set(k,String(v))});return p.toString()};
