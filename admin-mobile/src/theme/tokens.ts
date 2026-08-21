import type { TextStyle, ViewStyle } from "react-native";
export type ThemeMode = "light" | "dark" | "system";
export interface ThemeColors {
  background: string; surface: string; surfaceElevated: string; surfaceMuted: string; surfaceInteractive: string;
  text: string; textSecondary: string; textMuted: string; textInverse: string; border: string; borderStrong: string; divider: string;
  brand: string; brandPressed: string; brandSoft: string; brandForeground: string; success: string; successSoft: string;
  warning: string; warningSoft: string; danger: string; dangerSoft: string; info: string; infoSoft: string;
  inputBackground: string; inputBorder: string; placeholder: string; overlay: string; skeleton: string; shadow: string;
  chart: readonly [string, string, string, string, string, string];
}
export const lightColors: ThemeColors = {
  background: "#F4F7F5", surface: "#FFFFFF", surfaceElevated: "#FFFFFF", surfaceMuted: "#EBF1EE", surfaceInteractive: "#E3ECE8",
  text: "#15201C", textSecondary: "#40514A", textMuted: "#687A72", textInverse: "#FFFFFF", border: "#D7E1DC", borderStrong: "#AABBB3", divider: "#E1E8E4",
  brand: "#075E46", brandPressed: "#034937", brandSoft: "#D9F1E8", brandForeground: "#FFFFFF", success: "#167343", successSoft: "#DDF4E7",
  warning: "#A85D00", warningSoft: "#FFF0D6", danger: "#B3262E", dangerSoft: "#FCE4E5", info: "#1D62A7", infoSoft: "#DFEDFB",
  inputBackground: "#FFFFFF", inputBorder: "#AABBB3", placeholder: "#71827A", overlay: "rgba(10,22,17,.58)", skeleton: "#DDE6E1", shadow: "#071C14",
  chart: ["#075E46", "#D78000", "#2E6FC1", "#8A4EAA", "#B33B48", "#48756A"],
};
export const darkColors: ThemeColors = {
  background: "#0D1512", surface: "#141F1B", surfaceElevated: "#1A2923", surfaceMuted: "#1B2A24", surfaceInteractive: "#243730",
  text: "#F2F7F4", textSecondary: "#C5D2CC", textMuted: "#91A49B", textInverse: "#0D1512", border: "#2C4138", borderStrong: "#587066", divider: "#263A32",
  brand: "#54C59C", brandPressed: "#3EAA83", brandSoft: "#173B2F", brandForeground: "#08140F", success: "#65D397", successSoft: "#173B29",
  warning: "#F1B75C", warningSoft: "#402F15", danger: "#F18D93", dangerSoft: "#461F23", info: "#83BAF2", infoSoft: "#19344E",
  inputBackground: "#111C18", inputBorder: "#587066", placeholder: "#91A49B", overlay: "rgba(0,0,0,.72)", skeleton: "#293C34", shadow: "#000000",
  chart: ["#54C59C", "#F1B75C", "#83BAF2", "#CE9BE8", "#F18D93", "#83B5A8"],
};
export const spacing = { xxs: 2, xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48, section: 40 } as const;
export const radius = { small: 8, medium: 12, large: 16, xl: 22, pill: 999 } as const;
export const elevation = {
  none: {} satisfies ViewStyle,
  subtle: { elevation: 1, shadowOffset: { width: 0, height: 2 }, shadowOpacity: .04, shadowRadius: 6 } satisfies ViewStyle,
  card: { elevation: 2, shadowOffset: { width: 0, height: 5 }, shadowOpacity: .07, shadowRadius: 14 } satisfies ViewStyle,
  floating: { elevation: 7, shadowOffset: { width: 0, height: 10 }, shadowOpacity: .14, shadowRadius: 24 } satisfies ViewStyle,
};
export const typography = {
  display: { fontSize: 32, lineHeight: 39, fontWeight: "800", letterSpacing: -.5 } satisfies TextStyle,
  pageTitle: { fontSize: 26, lineHeight: 33, fontWeight: "800" } satisfies TextStyle,
  sectionTitle: { fontSize: 20, lineHeight: 27, fontWeight: "700" } satisfies TextStyle,
  cardTitle: { fontSize: 17, lineHeight: 23, fontWeight: "700" } satisfies TextStyle,
  body: { fontSize: 15, lineHeight: 22, fontWeight: "400" } satisfies TextStyle,
  bodyStrong: { fontSize: 15, lineHeight: 22, fontWeight: "700" } satisfies TextStyle,
  label: { fontSize: 14, lineHeight: 20, fontWeight: "600" } satisfies TextStyle,
  caption: { fontSize: 12, lineHeight: 18, fontWeight: "500" } satisfies TextStyle,
  overline: { fontSize: 11, lineHeight: 16, fontWeight: "800", letterSpacing: .9 } satisfies TextStyle,
  button: { fontSize: 15, lineHeight: 20, fontWeight: "700" } satisfies TextStyle,
  financialHero: { fontSize: 30, lineHeight: 38, fontWeight: "800", fontVariant: ["tabular-nums"] } satisfies TextStyle,
  financialValue: { fontSize: 21, lineHeight: 28, fontWeight: "800", fontVariant: ["tabular-nums"] } satisfies TextStyle,
  financialCompact: { fontSize: 15, lineHeight: 20, fontWeight: "700", fontVariant: ["tabular-nums"] } satisfies TextStyle,
  tableValue: { fontSize: 14, lineHeight: 20, fontWeight: "600", fontVariant: ["tabular-nums"] } satisfies TextStyle,
  status: { fontSize: 11, lineHeight: 16, fontWeight: "800", letterSpacing: .2 } satisfies TextStyle,
} as const;
export const colors = lightColors;
export const shadows = { card: elevation.card } as const;
