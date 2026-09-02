import { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { theme } from "@/theme";
import { isWholeNumberUnit, validateQuantityInput } from "@/utils/quantity";

export function ProductQuantityInput({
  value,
  unit,
  maxStock,
  onChange,
}: {
  value: string;
  unit: string;
  maxStock: number;
  onChange(value: string): void;
}) {
  const [isFocused, setIsFocused] = useState(false);
  const whole = isWholeNumberUnit(unit);
  const validation = validateQuantityInput(value, unit, maxStock);
  const hasError = Boolean(value.trim().length > 0 && validation.error);

  return (
    <View style={styles.container}>
      <View style={styles.inputWrap}>
        <View style={[styles.inputBox, isFocused && styles.inputBoxFocused, hasError && styles.inputBoxError]}>
          <TextInput
            accessibilityLabel={`Quantity in ${unit}`}
            value={value}
            onChangeText={(text) => onChange(text.replace(/,/g, "."))}
            keyboardType={whole ? "number-pad" : "decimal-pad"}
            inputMode={whole ? "numeric" : "decimal"}
            placeholder={whole ? "1" : "0.5"}
            placeholderTextColor="#94A3B8"
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            selectTextOnFocus
            style={styles.input}
          />
          <View style={styles.unitBadge}>
            <Text numberOfLines={1} style={styles.unitText}>
              {unit}
            </Text>
          </View>
        </View>
      </View>
      {hasError ? (
        <Text accessibilityRole="alert" style={styles.errorText}>
          {validation.error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 6,
  },
  inputWrap: {
    width: "100%",
  },
  inputBox: {
    height: 38,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
    paddingLeft: 10,
    paddingRight: 4,
  },
  inputBoxFocused: {
    borderColor: theme.colors.primary,
    backgroundColor: "#FFFFFF",
  },
  inputBoxError: {
    borderColor: theme.colors.danger,
    backgroundColor: "#FEF2F2",
  },
  input: {
    flex: 1,
    height: 38,
    paddingVertical: 0,
    paddingHorizontal: 0,
    fontSize: 13.5,
    fontWeight: "800",
    color: theme.colors.text,
  },
  unitBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  unitText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#475569",
  },
  errorText: {
    marginTop: 3,
    fontSize: 10,
    lineHeight: 13,
    fontWeight: "600",
    color: theme.colors.danger,
  },
});
