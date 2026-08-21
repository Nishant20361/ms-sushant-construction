import {Linking,Platform} from "react-native";import Constants from "expo-constants";import * as Notifications from "expo-notifications";import {adminApiClient} from "@/services/api/client";import {notificationChannels} from "./pushHelpers";
let currentToken:string|null=null;
export const pushService={
 async configure(){if(Platform.OS!=="android")return;for(const channel of notificationChannels)await Notifications.setNotificationChannelAsync(channel.id,{name:channel.name,importance:channel.importance==="high"?Notifications.AndroidImportance.HIGH:Notifications.AndroidImportance.DEFAULT})},
 async permission(){return(await Notifications.getPermissionsAsync()).status},
 async enable(){const permission=await Notifications.requestPermissionsAsync();if(permission.status!=="granted")return{permission:permission.status,registered:false};const projectId=Constants.easConfig?.projectId??Constants.expoConfig?.extra?.eas?.projectId;if(!projectId)return{permission:permission.status,registered:false,reason:"Expo project ID is not configured."};const token=(await Notifications.getExpoPushTokenAsync({projectId})).data;if(currentToken&&currentToken!==token)await adminApiClient.request("/admin/notifications/devices/current",{method:"DELETE",body:{expoPushToken:currentToken}}).catch(()=>undefined);await adminApiClient.request("/admin/notifications/devices",{method:"POST",body:{expoPushToken:token,platform:"android"}});currentToken=token;return{permission:permission.status,registered:true}},
 async unregister(){if(!currentToken)return;const token=currentToken;currentToken=null;await adminApiClient.request("/admin/notifications/devices/current",{method:"DELETE",body:{expoPushToken:token}})},
 openSettings:()=>Linking.openSettings(),get token(){return currentToken}
};
export type PushStatus={permission:string;registered:boolean;reason?:string};
