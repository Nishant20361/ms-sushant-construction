import { Text, type TextProps } from "react-native";
import { typography, useTheme } from "@/theme";
export function AppText({ role = "body", style, ...props }: Omit<TextProps, "role"> & { role?: keyof typeof typography }) { const t = useTheme(); return <Text allowFontScaling maxFontSizeMultiplier={2} {...props} style={[t.typography[role], { color: t.colors.text }, style]} />; }
