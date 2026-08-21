import { useLocalSearchParams } from "expo-router";
import { OrderEditScreen } from "@/features/orders/OrderEditScreen";
export default function OrderEditRoute(){const{id}=useLocalSearchParams<{id:string}>();return <OrderEditScreen id={Number(id)}/>}
