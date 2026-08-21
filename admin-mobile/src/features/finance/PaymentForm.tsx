import { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { AppText } from "@/components/AppText";
import { Button, Card, FilterChip, Input } from "@/components/ui";
import { useTheme } from "@/theme";
import { formatINR } from "@/utils/formatters";
import { dateError, paymentError } from "./helpers";
import type { PaymentMode, PaymentPayload } from "./types";

interface PaymentFormProps {
  title: string; subtitle: string; due: number; total?: number; paid?: number; loading: boolean; error?: string;
  onSubmit: (payload: PaymentPayload) => Promise<void>;
}

export function PaymentForm({ title, subtitle, due, total, paid, loading, error, onSubmit }: PaymentFormProps) {
  const theme = useTheme();
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState<PaymentMode>("CASH");
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");
  const amountError = useMemo(() => paymentError(amount, due), [amount, due]);
  const paymentDateError = dateError(date);
  return <View style={styles.gap}>
    <View><AppText role="sectionTitle">{title}</AppText><AppText style={{ color: theme.colors.textSecondary }}>{subtitle}</AppText></View>
    <Card elevated={false} style={styles.gap}>
      {total !== undefined && <Row label="Total" value={formatINR(total)} />}
      {paid !== undefined && <Row label="Already paid" value={formatINR(paid)} />}
      <Row label="Remaining due" value={formatINR(due)} danger />
    </Card>
    <Input label="Amount received" required prefix={<AppText>₹</AppText>} keyboardType="decimal-pad" value={amount} onChangeText={setAmount} error={amount && amountError ? amountError : undefined} />
    <AppText role="label">Payment mode</AppText>
    <View style={styles.row}><FilterChip label="Cash" selected={mode === "CASH"} onPress={() => setMode("CASH")} /><FilterChip label="Online (Admin recorded)" selected={mode === "ONLINE"} onPress={() => setMode("ONLINE")} /></View>
    <Input label="Payment date" placeholder="YYYY-MM-DD · optional" value={date} onChangeText={setDate} error={paymentDateError ?? undefined} />
    <Input label="Notes" placeholder="Reference or note · optional" multiline value={notes} onChangeText={setNotes} />
    <AppText role="caption" style={{ color: theme.colors.textMuted }}>ONLINE records an Admin-observed mode only; it is not gateway or bank verification.</AppText>
    {error && <AppText style={{ color: theme.colors.danger }}>{error}</AppText>}
    <Button title="Record Payment" loading={loading} disabled={!!amountError || !!paymentDateError || loading} onPress={() => onSubmit({ amount: Number(amount), paymentMode: mode, ...(date ? { paymentDate: date } : {}), ...(notes.trim() ? { notes: notes.trim() } : {}) })} />
  </View>;
}

function Row({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  const theme = useTheme();
  return <View style={styles.between}><AppText style={{ color: theme.colors.textSecondary }}>{label}</AppText><AppText role="financialCompact" style={danger ? { color: theme.colors.danger } : undefined}>{value}</AppText></View>;
}

const styles = StyleSheet.create({ gap: { gap: 14 }, row: { flexDirection: "row", gap: 8, flexWrap: "wrap" }, between: { flexDirection: "row", justifyContent: "space-between", gap: 12 } });
