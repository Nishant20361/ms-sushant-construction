import {useState} from "react";
import {StyleSheet,View} from "react-native";
import {Ionicons} from "@expo/vector-icons";
import {router} from "expo-router";
import {AppText} from "@/components/AppText";
import {Screen} from "@/components/Screen";
import {Button,Card,ConfirmDialog,Divider,ListRow} from "@/components/ui";
import {useAuth} from "@/features/auth/AuthProvider";
import {useTheme} from "@/theme";
export default function MoreRoute(){
 const t=useTheme(),auth=useAuth();const[confirm,setConfirm]=useState(false),[loggingOut,setLoggingOut]=useState(false);
 const logout=async()=>{setConfirm(false);setLoggingOut(true);await auth.logout();setLoggingOut(false)};
 return <Screen contentStyle={[s.content,{gap:t.spacing.xl,paddingBottom:t.spacing.xxxl}]}>
  <View><AppText role="pageTitle">More</AppText><AppText style={{color:t.colors.textSecondary}}>Additional Admin modules and account access.</AppText></View>
  <Card>
   <ListRow title="Categories" subtitle="Manage product groupings and category images" leading={<Ionicons name="layers-outline" size={22} color={t.colors.brand}/>} trailing={<Ionicons name="chevron-forward" size={17} color={t.colors.textMuted}/>} onPress={()=>router.push("/(admin)/categories" as never)}/><Divider/>
   <ListRow title="Billing" subtitle="Invoices, discounts, print, share and payments" leading={<Ionicons name="document-text-outline" size={22} color={t.colors.brand}/>} trailing={<Ionicons name="chevron-forward" size={17} color={t.colors.textMuted}/>} onPress={()=>router.push("/(admin)/billing" as never)}/><Divider/>
   <ListRow title="Analytics" subtitle="Sales, collections and performance insights" leading={<Ionicons name="bar-chart-outline" size={22} color={t.colors.brand}/>} trailing={<Ionicons name="chevron-forward" size={17} color={t.colors.textMuted}/>} onPress={()=>router.push("/(admin)/analytics" as never)}/><Divider/>
   <ListRow title="Reports" subtitle="Sales, dues, statements, history and exports" leading={<Ionicons name="reader-outline" size={22} color={t.colors.brand}/>} trailing={<Ionicons name="chevron-forward" size={17} color={t.colors.textMuted}/>} onPress={()=>router.push("/(admin)/reports" as never)}/><Divider/>
   <ListRow title="Settings" subtitle="Business, website, customer app and invoice" leading={<Ionicons name="settings-outline" size={22} color={t.colors.brand}/>} trailing={<Ionicons name="chevron-forward" size={17} color={t.colors.textMuted}/>} onPress={()=>router.push("/(admin)/settings" as never)}/><Divider/>
   <ListRow title="Account" subtitle="Profile, security, theme and notifications" leading={<Ionicons name="person-outline" size={22} color={t.colors.brand}/>} trailing={<Ionicons name="chevron-forward" size={17} color={t.colors.textMuted}/>} onPress={()=>router.push("/(admin)/account" as never)}/><Divider/>
  </Card>
  <Card style={{gap:t.spacing.md}}><AppText role="cardTitle">Signed in</AppText><AppText style={{color:t.colors.textSecondary}}>{auth.admin?.username}</AppText><AppText role="caption" style={{color:t.colors.textMuted}}>Role: {auth.admin?.role}. Role-level authorization remains server-controlled.</AppText><Button title="Sign Out" variant="outline" loading={loggingOut} disabled={loggingOut} onPress={()=>setConfirm(true)}/></Card>
  <ConfirmDialog visible={confirm} title="Sign out?" description="This clears the secure session and all Admin query data on this device." confirmLabel="Sign Out" danger={false} onCancel={()=>setConfirm(false)} onConfirm={()=>void logout()}/>
 </Screen>
}
const s=StyleSheet.create({content:{width:"100%",maxWidth:620,alignSelf:"center"}});
