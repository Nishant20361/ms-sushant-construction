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
    await Linking.openURL(value);
    return true;
  } catch { return false; }
}

export const telephoneUrl = (value: string) => `tel:${value.replace(/[^+\d]/g, "")}`;
export const emailUrl = (value: string) => `mailto:${value.trim()}`;
export const googleMapsDirectionsUrl = (destination: string) => `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination.trim())}`;

export function businessDirectionsUrl(settings?: { googleMapsUrl?: string | null; businessAddress?: string | null; address?: string | null } | null): string {
  const savedMapsUrl = settings?.googleMapsUrl?.trim() ?? "";
  if (savedMapsUrl) {
    try {
      const url = new URL(savedMapsUrl);
      if (url.protocol === "https:") {
        const queryDestination = url.searchParams.get("destination") || url.searchParams.get("q") || url.searchParams.get("query");
        if (queryDestination?.trim()) return googleMapsDirectionsUrl(queryDestination);
        const pathMatch = url.pathname.match(/\/maps\/(?:place|search)\/([^/]+)/i);
        if (pathMatch?.[1]) return googleMapsDirectionsUrl(decodeURIComponent(pathMatch[1].replace(/\+/g, " ")));
        return url.toString();
      }
    } catch { /* fall through to the saved address */ }
  }
  const address = settings?.businessAddress?.trim() || settings?.address?.trim() || "";
  return address ? googleMapsDirectionsUrl(address) : "";
}
