import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppText } from "./AppText";
import { Card } from "./ui";
import { Screen } from "./Screen";
import { useTheme } from "@/theme";
export function ModulePlaceholder({ title, description, icon }: { title: string; description: string; icon: keyof typeof Ionicons.glyphMap }) { const t = useTheme(); return <Screen centered contentStyle={s.content}><Card style={s.card}><View style={[s.icon, { backgroundColor: t.colors.brandSoft }]}><Ionicons name={icon} size={30} color={t.colors.brand} /></View><AppText role="pageTitle" style={s.center}>{title}</AppText><AppText style={[s.center, { color: t.colors.textSecondary }]}>{description}</AppText><AppText role="caption" style={[s.center, { color: t.colors.textMuted }]}>This route is ready for its approved implementation phase. No business data is loaded here.</AppText></Card></Screen>; }
const s = StyleSheet.create({ content: { width: "100%", maxWidth: 480, alignSelf: "center" }, card: { alignItems: "center", gap: 12 }, icon: { width: 60, height: 60, borderRadius: 18, alignItems: "center", justifyContent: "center" }, center: { textAlign: "center" } });
