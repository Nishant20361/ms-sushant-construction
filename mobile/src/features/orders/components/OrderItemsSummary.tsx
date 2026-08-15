import { StyleSheet, Text, View } from "react-native";
import type { TrackedOrderItem } from "@/types/domain";
import { theme } from "@/theme";
import { formatINR, formatQuantity } from "@/utils/format";
export function OrderItemsSummary({ items }: { items: TrackedOrderItem[] }) { return <View style={styles.list}>{items.map((item, index) => <View key={`${item.productName}-${index}`} style={styles.row}><View style={styles.body}><Text style={styles.name}>{item.productName}</Text><Text style={styles.meta}>{formatQuantity(item.quantity, item.unit)} × {formatINR(item.price)}</Text></View><Text style={styles.total}>{formatINR(item.total)}</Text></View>)}</View>; }
const styles = StyleSheet.create({ list: { marginTop: 14 }, row: { flexDirection: "row", paddingVertical: 11, borderTopWidth: 1, borderTopColor: theme.colors.border }, body: { flex: 1 }, name: { fontWeight: "700", color: theme.colors.text }, meta: { marginTop: 3, color: theme.colors.muted }, total: { fontWeight: "800", color: theme.colors.text } });
