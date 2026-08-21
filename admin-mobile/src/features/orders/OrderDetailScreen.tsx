import {useState} from "react";
import {Linking,StyleSheet,View} from "react-native";
import {router} from "expo-router";
import {useNetInfo} from "@react-native-community/netinfo";
import {Screen} from "@/components/Screen";
import {AppText} from "@/components/AppText";
import {Button,Card,ConfirmDialog,Divider,EmptyState,ErrorState,IconButton,LoadingState,ModalShell,StatusBadge} from "@/components/ui";
import {useTheme} from "@/theme";
import {formatDateTime,formatINR,formatQuantity} from "@/utils/formatters";
import {label,paymentTone,statusTone,statusWarning} from "./helpers";
import {ORDER_STATUSES,type OrderStatus} from "./types";
import {useOrder,useOrderMutations} from "./useOrders";

export function OrderDetailScreen({id}:{id:number}){
  const t=useTheme(),net=useNetInfo(),q=useOrder(id),m=useOrderMutations(id);
  const[statusOpen,setStatusOpen]=useState(false),[next,setNext]=useState<OrderStatus|null>(null);
  if(q.isPending)return <Screen centered><LoadingState label="Loading order…"/></Screen>;
  if(q.isError||!q.data)return <Screen centered><ErrorState description={q.error?.message??"Order not found"} onRetry={()=>q.refetch()}/></Screen>;
  const o=q.data;
  return <Screen scrollProps={{refreshControl:undefined}} contentStyle={s.page}>
    <View style={s.nav}><IconButton icon="arrow-back" label="Back" onPress={()=>router.back()}/><View style={s.flex}><AppText role="pageTitle" numberOfLines={1}>{o.orderNumber}</AppText><AppText role="caption" style={{color:t.colors.textMuted}}>{formatDateTime(o.createdAt)}</AppText></View></View>
    {net.isConnected===false&&<Card style={{backgroundColor:t.colors.warningSoft}}><AppText style={{color:t.colors.warning}}>Offline · cached details may be stale. Changes are disabled.</AppText></Card>}
    <Card style={s.gap}><View style={s.badges}><StatusBadge label={label(o.status)} tone={statusTone(o.status)}/><StatusBadge label={label(o.paymentStatus)} tone={paymentTone(o.paymentStatus)}/></View><Row label="Order total" value={formatINR(o.finalAmount)} strong/><Row label="Paid" value={formatINR(o.paidTotal)} success/><Row label="Due" value={formatINR(o.due)} danger={o.due>0}/><Divider/><View style={s.actions}><Button title="Change status" variant="outline" disabled={net.isConnected===false} onPress={()=>setStatusOpen(true)} style={s.flex}/><Button title="Edit items" disabled={net.isConnected===false||o.status==="CANCELLED"} onPress={()=>router.push(`/(admin)/orders/${id}/edit` as never)} style={s.flex}/></View><View style={s.actions}><Button title="Open Billing" variant="secondary" onPress={()=>router.push(`/(admin)/billing?orderId=${id}` as never)} style={s.flex}/><Button title="Record Payment" disabled={o.due<=0||net.isConnected===false} onPress={()=>router.push(`/(admin)/payments/order/${id}` as never)} style={s.flex}/></View></Card>
    <Card style={s.gap}><AppText role="sectionTitle">Customer</AppText><AppText role="cardTitle">{o.customerName}</AppText><AppText>{o.customerMobile||"No mobile provided"}</AppText>{o.deliveryAddress&&<AppText style={{color:t.colors.textSecondary}}>{o.deliveryAddress}</AppText>}<View style={s.actions}><Button title="Call" variant="outline" disabled={!o.customerMobile} onPress={()=>Linking.openURL(`tel:${o.customerMobile}`)} style={s.flex}/><Button title="WhatsApp" variant="secondary" disabled={!o.customerMobile} onPress={()=>Linking.openURL(`https://wa.me/${o.customerMobile.replace(/\D/g,"")}`)} style={s.flex}/></View>{o.deliveryAddress&&<Button title="Open address in Maps" variant="ghost" onPress={()=>Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(o.deliveryAddress!)}`)}/>}</Card>
    <Card style={s.gap}><AppText role="sectionTitle">Items ({o.items.length})</AppText>{o.items.map((x,i)=><View key={`${x.productId}-${i}`} style={s.gapSmall}><View style={s.between}><View style={s.flex}><AppText role="bodyStrong">{x.productName}</AppText><AppText role="caption" style={{color:t.colors.textSecondary}}>{formatQuantity(x.quantity,x.unit)} × {formatINR(x.price)}</AppText></View><AppText role="financialCompact">{formatINR(x.total)}</AppText></View>{i<o.items.length-1&&<Divider/>}</View>)}</Card>
    <Card style={s.gap}><AppText role="sectionTitle">Payment history</AppText>{o.payments.length?o.payments.map((p,i)=><View key={p.id} style={s.gapSmall}><View style={s.between}><View><AppText role="bodyStrong">{label(p.paymentMode)}</AppText><AppText role="caption" style={{color:t.colors.textMuted}}>{formatDateTime(p.paymentDate)}</AppText></View><AppText role="financialCompact" style={{color:t.colors.success}}>+{formatINR(p.amount)}</AppText></View>{p.notes&&<AppText role="caption">{p.notes}</AppText>}{i<o.payments.length-1&&<Divider/>}</View>):<EmptyState title="No payments recorded" description="Payments are append-only and will appear here."/>}</Card>
    {o.notes&&<Card style={s.gap}><AppText role="sectionTitle">Order notes</AppText><AppText>{o.notes}</AppText></Card>}
    <ModalShell visible={statusOpen} onClose={()=>setStatusOpen(false)} title="Change order status">{ORDER_STATUSES.map(x=><Button key={x} title={`${label(x)}${x===o.status?" · Current":""}`} variant={x===o.status?"secondary":"outline"} disabled={x===o.status} onPress={()=>{setStatusOpen(false);setNext(x)}}/>)}</ModalShell>
    <ConfirmDialog visible={!!next} title="Confirm status change" description={next?statusWarning(o.status,next):""} confirmLabel="Update status" danger={next==="CANCELLED"} onCancel={()=>setNext(null)} onConfirm={async()=>{if(!next)return;try{await m.status.mutateAsync(next);setNext(null)}catch{}}}/>
    {m.status.isError&&<AppText style={{color:t.colors.danger}}>{m.status.error.message}</AppText>}
  </Screen>
}
function Row({label:lbl,value,strong,danger,success}:{label:string;value:string;strong?:boolean;danger?:boolean;success?:boolean}){const t=useTheme();return <View style={s.between}><AppText style={{color:t.colors.textSecondary}}>{lbl}</AppText><AppText role={strong?"financialValue":"financialCompact"} style={{color:danger?t.colors.danger:success?t.colors.success:t.colors.text}}>{value}</AppText></View>}
const s=StyleSheet.create({page:{gap:16,paddingBottom:40},nav:{flexDirection:"row",alignItems:"center",gap:8},flex:{flex:1},gap:{gap:14},gapSmall:{gap:8},badges:{flexDirection:"row",gap:8,flexWrap:"wrap"},between:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",gap:12},actions:{flexDirection:"row",gap:10}});
