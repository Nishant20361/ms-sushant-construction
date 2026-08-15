import { Linking } from "react-native";

const safeSchemes = new Set(["https:", "tel:", "mailto:"]);

export async function openExternalUrl(rawUrl: string): Promise<boolean> {
  const value = rawUrl.trim();
  if (!value || /[\r\n]/.test(value)) return false;
  try {
    const url = new URL(value);
    if (!safeSchemes.has(url.protocol)) return false;
    if (url.protocol === "https:" && !url.hostname) return false;
    if (url.protocol === "tel:" && !/^\+?\d{7,15}$/.test(url.pathname)) return false;
    if (url.protocol === "mailto:" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(decodeURIComponent(url.pathname))) return false;
    if (!(await Linking.canOpenURL(value))) return false;
    await Linking.openURL(value);
    return true;
  } catch { return false; }
}

export const telephoneUrl = (value: string) => `tel:${value.replace(/[^+\d]/g, "")}`;
export const emailUrl = (value: string) => `mailto:${value.trim()}`;
