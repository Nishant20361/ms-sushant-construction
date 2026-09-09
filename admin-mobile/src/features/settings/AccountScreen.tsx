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

import { authService, type SessionInfo } from "@/features/auth/authService";

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

  // 2FA Security
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [toggling2fa, setToggling2fa] = useState(false);

  // Active Sessions / Devices (Max 5-6 phones)
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [activeSessionsCount, setActiveSessionsCount] = useState(0);
  const [maxSessionsAllowed, setMaxSessionsAllowed] = useState(6);
  const [loadingSessions, setLoadingSessions] = useState(false);

  const [push, setPush] = useState<PushStatus>({
    permission: "undetermined",
    registered: !!pushService.token,
  });

  const loadSessions = async () => {
    try {
      setLoadingSessions(true);
      const res = await authService.getSessions();
      setSessions(res.sessions);
      setActiveSessionsCount(res.activeCount);
      setMaxSessionsAllowed(res.maxAllowed);
    } catch {
      // Ignore background session fetch errors
    } finally {
      setLoadingSessions(false);
    }
  };

  useEffect(() => {
    if (q.data) {
      setEmail(q.data.email ?? "");
      setThreshold(String(q.data.lowStockThreshold));
    }
  }, [q.data]);

  useEffect(() => {
    if (auth.admin?.twoFactorEnabled !== undefined) {
      setTwoFactorEnabled(!!auth.admin.twoFactorEnabled);
    }
    void loadSessions();
  }, [auth.admin]);

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

  const toggle2faHandler = async () => {
    if (!email.trim()) {
      Alert.alert("Email Required", "Please set and save your Notification Email above first before enabling 2FA.");
      return;
    }
    const nextState = !twoFactorEnabled;
    try {
      setToggling2fa(true);
      const res = await authService.toggle2FA(nextState);
      setTwoFactorEnabled(res.twoFactorEnabled);
      await auth.refreshSession();
      Alert.alert(nextState ? "2FA Enabled" : "2FA Disabled", res.message);
    } catch (e) {
      Alert.alert("Failed", e instanceof Error ? e.message : "Unable to toggle 2FA.");
    } finally {
      setToggling2fa(false);
    }
  };

  const revokeSessionHandler = (sessionId: string, deviceInfo: string | null) => {
    Alert.alert(
      "Revoke Device",
      `Are you sure you want to log out ${deviceInfo || "this device"}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Log Out Device",
          style: "destructive",
          onPress: async () => {
            try {
              await authService.revokeSession(sessionId);
              await loadSessions();
              Alert.alert("Success", "Device session revoked.");
            } catch (e) {
              Alert.alert("Error", e instanceof Error ? e.message : "Could not revoke session.");
            }
          },
        },
      ]
    );
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

      {/* Two-Factor Authentication (2FA) */}
      <Card style={s.gap}>
        <View style={s.between}>
          <AppText role="sectionTitle">Two-Factor Authentication (2FA)</AppText>
          <StatusBadge
            label={twoFactorEnabled ? "2FA Active" : "2FA Disabled"}
            tone={twoFactorEnabled ? "success" : "neutral"}
          />
        </View>
        <AppText style={{ color: t.colors.textSecondary }}>
          जब 2FA चालू होगा, तो हर नए फोन/डिवाइस पर लॉगिन करने के लिए आपके रजिस्टर्ड ईमेल ({email || "ईमेल"}) पर 6 अंकों का OTP भेजा जाएगा।
        </AppText>
        <Button
          title={twoFactorEnabled ? "Disable 2FA Security" : "Enable 2FA Security"}
          variant={twoFactorEnabled ? "outline" : "primary"}
          loading={toggling2fa}
          disabled={offline || toggling2fa}
          onPress={() => void toggle2faHandler()}
        />
      </Card>

      {/* Connected Phones & Active Sessions */}
      <Card style={s.gap}>
        <View style={s.between}>
          <AppText role="sectionTitle">Connected Staff Phones (सक्रिय फोन)</AppText>
          <StatusBadge
            label={`${activeSessionsCount} / ${maxSessionsAllowed} Phones`}
            tone={activeSessionsCount >= maxSessionsAllowed ? "warning" : "info"}
          />
        </View>
        <AppText style={{ color: t.colors.textSecondary }}>
          अधिकतम {maxSessionsAllowed} स्टाफ फोन एक समय में एक्टिव रह सकते हैं। 7वां फोन लॉगिन होते ही सबसे पुराना फोन अपने आप लॉगआउट हो जाएगा।
        </AppText>
        {sessions.map((sess) => (
          <View
            key={sess.id}
            style={{
              padding: t.spacing.md,
              borderRadius: t.radius.medium,
              borderColor: sess.isCurrent ? t.colors.brand : t.colors.border,
              borderWidth: 1,
              backgroundColor: sess.isCurrent ? t.colors.brandSoft : t.colors.surfaceElevated,
              gap: 4,
            }}
          >
            <View style={s.between}>
              <AppText role="bodyStrong">
                📱 {sess.deviceInfo || "Mobile Device"}
              </AppText>
              {sess.isCurrent ? (
                <StatusBadge label="This Phone (Current)" tone="success" />
              ) : (
                <Button
                  title="Revoke / Logout"
                  variant="outline"
                  onPress={() => revokeSessionHandler(sess.id, sess.deviceInfo)}
                  style={{ minHeight: 32, paddingHorizontal: 10 }}
                />
              )}
            </View>
            <AppText role="caption" style={{ color: t.colors.textSecondary }}>
              IP: {sess.ipAddress || "Unknown"} • Active: {new Date(sess.lastActiveAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
            </AppText>
          </View>
        ))}
        <Button
          title="Refresh Connected Phones"
          variant="outline"
          loading={loadingSessions}
          disabled={offline || loadingSessions}
          onPress={() => void loadSessions()}
        />
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
