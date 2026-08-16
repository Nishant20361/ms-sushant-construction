import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { theme } from "@/theme";
import { isWholeNumberUnit, validateQuantityInput } from "@/utils/quantity";

export function ProductQuantityInput({ value, unit, maxStock, onChange }: { value: string; unit: string; maxStock: number; onChange(value: string): void }) {
  const whole = isWholeNumberUnit(unit);
  const validation = validateQuantityInput(value, unit, maxStock);
  const step = whole ? 1 : 0.5;
  const adjust = (direction: -1 | 1) => {
    const current = validation.quantity ?? 0;
    const next = Math.max(0, Math.min(maxStock, Math.round((current + direction * step) * 1000) / 1000));
    onChange(next > 0 ? String(next) : "");
  };
  return <View style={styles.container}>
    <Text style={styles.label}>Quantity</Text>
    <View style={styles.row}>
      <Pressable accessibilityRole="button" accessibilityLabel="Decrease quantity" onPress={() => adjust(-1)} style={styles.step}><Text style={styles.symbol}>−</Text></Pressable>
      <TextInput accessibilityLabel={`Quantity in ${unit}`} value={value} onChangeText={(text) => onChange(text.replace(/,/g, "."))} keyboardType={whole ? "number-pad" : "decimal-pad"} inputMode={whole ? "numeric" : "decimal"} placeholder={whole ? "1" : "0.5"} placeholderTextColor={theme.colors.muted} selectTextOnFocus style={styles.input} />
      <Pressable accessibilityRole="button" accessibilityLabel="Increase quantity" onPress={() => adjust(1)} style={styles.step}><Text style={styles.symbol}>+</Text></Pressable>
      <Text numberOfLines={1} style={styles.unit}>{unit}</Text>
    </View>
    {validation.error ? <Text accessibilityRole="alert" style={styles.error}>{validation.error}</Text> : null}
  </View>;
}

const styles = StyleSheet.create({ container: { marginTop: 10 }, label: { marginBottom: 5, fontSize: 11, fontWeight: "700", color: theme.colors.muted }, row: { flexDirection: "row", alignItems: "center", gap: 5 }, step: { width: 34, height: 38, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: theme.colors.border, borderRadius: 9, backgroundColor: theme.colors.surface }, symbol: { fontSize: 20, color: theme.colors.primary, fontWeight: "700" }, input: { minWidth: 42, height: 38, flex: 1, paddingHorizontal: 6, paddingVertical: 0, textAlign: "center", borderWidth: 1, borderColor: theme.colors.border, borderRadius: 9, backgroundColor: theme.colors.background, color: theme.colors.text, fontWeight: "700" }, unit: { maxWidth: 42, fontSize: 11, color: theme.colors.muted }, error: { marginTop: 5, fontSize: 10, lineHeight: 14, color: theme.colors.danger } });
