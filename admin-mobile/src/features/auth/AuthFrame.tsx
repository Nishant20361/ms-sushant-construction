import type { PropsWithChildren } from "react";
import { StyleSheet, View } from "react-native";
import { AppText } from "@/components/AppText";
import { BrandLogo } from "@/components/BrandLogo";
import { Card } from "@/components/ui";
import { useTheme } from "@/theme";

export function AuthFrame({
  title,
  subtitle,
  children,
}: PropsWithChildren<{ title: string; subtitle: string }>) {
  const t = useTheme();
  return (
    <Card style={s.card}>
      <View style={s.header}>
        <BrandLogo size={52} />
        <AppText role="pageTitle" style={s.center}>
          Sushant Control
        </AppText>
        <AppText style={[s.center, { color: t.colors.textSecondary, fontSize: 12 }]}>
          M/S Sushant Construction Admin
        </AppText>
      </View>
      <View style={{ gap: 2 }}>
        <AppText role="sectionTitle" style={{ fontSize: 18 }}>{title}</AppText>
        <AppText style={{ color: t.colors.textSecondary, fontSize: 12 }}>{subtitle}</AppText>
      </View>
      {children}
    </Card>
  );
}

const s = StyleSheet.create({
  card: {
    width: "100%",
    maxWidth: 440,
    alignSelf: "center",
    gap: 14,
    padding: 18,
  },
  header: {
    alignItems: "center",
    gap: 5,
  },
  center: {
    textAlign: "center",
  },
});
