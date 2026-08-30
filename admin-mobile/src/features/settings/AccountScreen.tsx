import React, { useEffect, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { useNetInfo } from "@react-native-community/netinfo";
import { useQueryClient } from "@tanstack/react-query";
import { AppText } from "@/components/AppText";
import { Screen } from "@/components/Screen";
import { Button, Card, ErrorState, FormField, LoadingState, SegmentedControl, StatusBadge } from "@/components/ui";
import { PasswordField } from "@/features/auth/PasswordField";
import { useAuth } from "@/features/auth/AuthProvider";
import { pushService, type PushStatus } from "@/features/push/pushService";
import { permissionLabel } from "@/features/push/pushHelpers";
import { adminQueryKeys } from "@/constants/queryKeys";
import { useTheme } from "@/theme";
import type { ThemeMode } from "@/theme/tokens";
import { settingsService } from "./settingsService";
import { useProfile } from "./useSettings";

export function AccountScreen() {
  const t = useTheme();
  const auth = useAuth();
  const net = useNetInfo();
  const qc = useQueryClient();
  const q = useProfile();

  const [email, setEmail] = useState("");
  const [threshold, setThreshold] = useState("10");
  const [saving, setSaving] = useState(false);

  // Admin Account Password
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [changing, setChanging] = useState(false);

  // Khatabook Security
  const [khatabookCurrentPin, setKhatabookCurrentPin] = useState("");
  const [khatabookNewPin, setKhatabookNewPin] = useState("");
  const [khatabookConfirmPin, setKhatabookConfirmPin] = useState("");
  const [khatabookRecoveryEmail, setKhatabookRecoveryEmail] = useState("");
  const [khatabookSaving, setKhatabookSaving] = useState(false);

  const [push, setPush] = useState<PushStatus>({
    permission: "undetermined",
    registered: !!pushService.token,
  });

  useEffect(() => {
    if (q.data) {
      setEmail(q.data.email ?? "");
      setThreshold(String(q.data.lowStockThreshold));
    }
  }, [q.data]);

  useEffect(() => {
    void pushService.permission().then((permission) => setPush((x) => ({ ...x, permission })));
    void settingsService.getKhatabookAuthStatus().then((res) => {
      if (res.recoveryEmail) setKhatabookRecoveryEmail(res.recoveryEmail);
    }).catch(() => {});
  }, []);

  if (q.isPending && !q.data) return <Screen centered><LoadingState label="Loading account…" /></Screen>;
  if (q.error && !q.data) return <Screen centered><ErrorState description="Account could not be loaded." onRetry={() => void q.refetch()} /></Screen>;

  const offline = net.isConnected === false || net.isInternetReachable === false;

  const saveProfile = async () => {
    try {
      setSaving(true);
      await settingsService.saveProfile(Number(threshold));
      await settingsService.saveEmail(email.trim());
      await qc.invalidateQueries({ queryKey: adminQueryKeys.profile() });
      await auth.refreshSession();
      Alert.alert("Account updated", "Notification email and stock threshold were saved.");
    } catch (e) {
      Alert.alert("Update failed", e instanceof Error ? e.message : "Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const passwordError =
    next.length > 0 && next.length < 12
      ? "New password must be at least 12 characters."
      : next !== confirm
      ? "Passwords do not match."
      : null;

  const change = async () => {
    try {
      setChanging(true);
      await auth.changePassword(current, next);
      Alert.alert("Success", "Password changed successfully.");
    } catch (e) {
      Alert.alert("Password change failed", e instanceof Error ? e.message : "Please try again.");
    } finally {
      setCurrent("");
      setNext("");
      setConfirm("");
      setChanging(false);
    }
  };

  const saveKhatabookSecurity = async () => {
    if (khatabookNewPin.trim() && khatabookNewPin.trim().length < 4) {
      Alert.alert("Invalid PIN", "New PIN must be at least 4 digits.");
      return;
    }
    if (khatabookNewPin.trim() && khatabookNewPin !== khatabookConfirmPin) {
      Alert.alert("Mismatch", "New PIN and Confirm PIN do not match.");
      return;
    }
    try {
      setKhatabookSaving(true);
      const res = await settingsService.changeKhatabookSecurity({
        currentPin: khatabookCurrentPin.trim() || undefined,
        newPin: khatabookNewPin.trim() || undefined,
        recoveryEmail: khatabookRecoveryEmail.trim() || undefined,
      });
      Alert.alert("Khatabook Updated", res.message || "Security settings updated successfully!");
      setKhatabookCurrentPin("");
      setKhatabookNewPin("");
      setKhatabookConfirmPin("");
    } catch (e) {
      Alert.alert("Update failed", e instanceof Error ? e.message : "Please check your current PIN.");
    } finally {
      setKhatabookSaving(false);
    }
  };

  const enable = async () => {
    try {
      const result = await pushService.enable();
      setPush(result);
      if (!result.registered && result.reason) Alert.alert("Push setup incomplete", result.reason);
    } catch (e) {
      Alert.alert("Notifications unavailable", e instanceof Error ? e.message : "Please try again.");
    }
  };

  return (
    <Screen keyboardAware contentStyle={[s.page, { gap: t.spacing.xl, paddingBottom: t.spacing.xxxl }]}>
      <View>
        <AppText role="pageTitle">Admin Settings & Security</AppText>
        <AppText style={{ color: t.colors.textSecondary }}>
          एडमिन प्रोफाइल, खाताबुक पिन, रिकवरी ईमेल एवं सुरक्षा
        </AppText>
      </View>

      {/* Profile Card */}
      <Card style={s.gap}>
        <AppText role="sectionTitle">Profile & Store</AppText>
        <Row label="Username" value={auth.admin?.username ?? q.data?.username ?? "—"} />
        <Row label="Role" value={auth.admin?.role ?? "ADMIN"} />
        <FormField label="Notification email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
        <FormField label="Low-stock threshold" value={threshold} onChangeText={setThreshold} keyboardType="number-pad" />
        <Button title="Save Profile" loading={saving} disabled={offline || saving || !Number.isInteger(Number(threshold)) || Number(threshold) < 0} onPress={() => void saveProfile()} />
      </Card>

      {/* Khatabook PIN & Recovery Email Card */}
      <Card style={s.gap}>
        <AppText role="sectionTitle">खाताबुक सुरक्षा एवं पिन (Khatabook PIN & Recovery)</AppText>
        <AppText style={{ color: t.colors.textSecondary }}>
          खाताबुक सुरक्षा पिन और पासवर्ड रीसेट के लिए रिकवरी Gmail सेट करें।
        </AppText>
        <FormField
          label="वर्तमान पिन (Current PIN or default 1234)"
          value={khatabookCurrentPin}
          onChangeText={setKhatabookCurrentPin}
          secureTextEntry
          keyboardType="number-pad"
        />
        <FormField
          label="रिकवरी जीमेल (Forgot PIN / OTP Gmail)"
          value={khatabookRecoveryEmail}
          onChangeText={setKhatabookRecoveryEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <FormField
          label="नया पिन (New 4-digit PIN)"
          value={khatabookNewPin}
          onChangeText={setKhatabookNewPin}
          secureTextEntry
          keyboardType="number-pad"
        />
        <FormField
          label="नया पिन दोबारा दर्ज करें (Confirm New PIN)"
          value={khatabookConfirmPin}
          onChangeText={setKhatabookConfirmPin}
          secureTextEntry
          keyboardType="number-pad"
        />
        <Button
          title="Save Khatabook Security"
          loading={khatabookSaving}
          disabled={offline || khatabookSaving}
          onPress={() => void saveKhatabookSecurity()}
        />
      </Card>

      {/* Appearance */}
      <Card style={s.gap}>
        <AppText role="sectionTitle">Appearance</AppText>
        <SegmentedControl options={["system", "light", "dark"] as const} value={t.preference} onChange={(v: ThemeMode) => t.setPreference(v)} />
        <AppText role="caption" style={{ color: t.colors.textMuted }}>Theme is stored locally and never sent to the server.</AppText>
      </Card>

      {/* Push notifications */}
      <Card style={s.gap}>
        <View style={s.between}>
          <AppText role="sectionTitle">Push notifications</AppText>
          <StatusBadge label={permissionLabel(push.permission)} tone={push.permission === "granted" ? "success" : "neutral"} />
        </View>
        <AppText style={{ color: t.colors.textSecondary }}>Enable notifications to receive new order, stock and payment alerts.</AppText>
        {push.reason && <AppText style={{ color: t.colors.warning }}>{push.reason}</AppText>}
        <View style={s.actions}>
          <Button title="Enable Notifications" disabled={offline} onPress={() => void enable()} style={s.flex} />
          <Button title="Open System Settings" variant="outline" onPress={() => void pushService.openSettings()} style={s.flex} />
        </View>
      </Card>

      {/* Change Password */}
      <Card style={s.gap}>
        <AppText role="sectionTitle">Change Admin Password</AppText>
        <PasswordField label="Current Password" value={current} onChangeText={setCurrent} />
        <PasswordField label="New Password" value={next} onChangeText={setNext} />
        <PasswordField label="Confirm New Password" value={confirm} onChangeText={setConfirm} />
        {next && passwordError && <AppText style={{ color: t.colors.danger }}>{passwordError}</AppText>}
        <Button title="Change Password" loading={changing} disabled={offline || changing || !current || !!passwordError} onPress={() => void change()} />
        <AppText role="caption" style={{ color: t.colors.textMuted }}>A successful change signs this device out and requires a fresh login.</AppText>
      </Card>
    </Screen>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  const t = useTheme();
  return (
    <View style={s.between}>
      <AppText style={{ color: t.colors.textSecondary }}>{label}</AppText>
      <AppText role="bodyStrong">{value}</AppText>
    </View>
  );
}

const s = StyleSheet.create({
  page: { width: "100%", maxWidth: 680, alignSelf: "center" },
  gap: { gap: 14 },
  between: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 },
  actions: { flexDirection: "row", gap: 12 },
  flex: { flex: 1 },
});
