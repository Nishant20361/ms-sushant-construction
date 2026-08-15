import { Pressable, StyleSheet, Text, View } from "react-native";
import { theme } from "@/theme";
import { formatQuantity } from "@/utils/format";
import { normalizeQuantity } from "@/utils/quantity";
import { isWholeNumberUnit } from "@/utils/quantity";

export function QuantityControl({ value, unit, maxStock, onChange }: { value: number; unit: string; maxStock: number; onChange: (value: number) => void }) {
  const step = isWholeNumberUnit(unit) ? 1 : 0.5;
  const minimum = isWholeNumberUnit(unit) ? 1 : 0.001;
  const canDecrease = value > minimum;
  const canIncrease = value < maxStock;
  return <View style={styles.row}>
    <Pressable accessibilityRole="button" accessibilityLabel="Decrease quantity" accessibilityState={{ disabled: !canDecrease }} disabled={!canDecrease} style={[styles.button, !canDecrease && styles.disabled]} onPress={() => onChange(normalizeQuantity(value - step, unit, maxStock))}><Text style={styles.symbol}>−</Text></Pressable>
    <Text style={styles.value}>{formatQuantity(value, unit)}</Text>
    <Pressable accessibilityRole="button" accessibilityLabel="Increase quantity" accessibilityState={{ disabled: !canIncrease }} disabled={!canIncrease} style={[styles.button, !canIncrease && styles.disabled]} onPress={() => onChange(normalizeQuantity(value + step, unit, maxStock))}><Text style={styles.symbol}>+</Text></Pressable>
  </View>;
}
const styles = StyleSheet.create({ row: { flexDirection: "row", alignItems: "center", gap: 8 }, button: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: theme.colors.border, borderRadius: 8, backgroundColor: theme.colors.surface }, disabled: { opacity: 0.4 }, symbol: { fontSize: 22, color: theme.colors.primary }, value: { minWidth: 72, textAlign: "center", color: theme.colors.text, fontWeight: "600" } });
