import { Image } from "expo-image";
import { StyleSheet, Text, View } from "react-native";
import { theme } from "@/theme";
import type { CartItem } from "@/types/domain";
import { formatINR } from "@/utils/format";
import { resolveImageUrl } from "@/utils/images";

export function CheckoutItem({ item }: { item: CartItem }) {
  return <View style={styles.row}>{item.imageUrl ? <Image source={resolveImageUrl(item.imageUrl, 160)} style={styles.image} contentFit="cover" transition={150} /> : <View style={styles.image} />}<View style={styles.body}><Text style={styles.name}>{item.name}</Text><Text style={styles.meta}>{item.quantity} {item.unit} × {formatINR(item.price)}</Text></View><Text style={styles.total}>{formatINR(item.quantity * item.price)}</Text></View>;
}
const styles = StyleSheet.create({ row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.border }, image: { width: 54, height: 54, borderRadius: 8, backgroundColor: theme.colors.border }, body: { flex: 1 }, name: { fontWeight: "700", color: theme.colors.text }, meta: { marginTop: 4, color: theme.colors.muted }, total: { fontWeight: "800", color: theme.colors.text } });
