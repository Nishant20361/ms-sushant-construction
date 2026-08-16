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

function locationFromMapsUrl(rawUrl: string): string {
  const url = new URL(rawUrl);
  const query = url.searchParams.get("destination") || url.searchParams.get("q") || url.searchParams.get("query");
  if (query?.trim()) return query.trim();
  const pathMatch = url.pathname.match(/\/maps\/(?:place|search|dir)\/([^/]+)/i);
  if (pathMatch?.[1]) return decodeURIComponent(pathMatch[1].replace(/\+/g, " "));
  const coordinates = rawUrl.match(/!2d(-?\d+(?:\.\d+)?)!3d(-?\d+(?:\.\d+)?)/);
  if (coordinates) return `${coordinates[2]},${coordinates[1]}`;
  return "";
}

export function businessDirectionsUrl(settings?: { googleMapsUrl?: string | null; businessAddress?: string | null; address?: string | null } | null): string {
  const savedMapsUrl = settings?.googleMapsUrl?.trim() ?? "";
  if (savedMapsUrl) {
    try {
      const url = new URL(savedMapsUrl);
      const isGoogleMaps = /(^|\.)google\.com$|(^|\.)googleapis\.com$|(^|\.)google\.co\.in$|^maps\.app\.goo\.gl$/i.test(url.hostname);
      if (url.protocol === "https:" && isGoogleMaps) {
        const location = locationFromMapsUrl(savedMapsUrl);
        if (location) return googleMapsDirectionsUrl(location);
        const isEmbedUrl = /\/embed(?:\/|$)/i.test(url.pathname) || url.searchParams.get("output") === "embed" || url.searchParams.has("pb");
        if (!isEmbedUrl) return url.toString();
      }
    } catch { /* fall through to the saved address */ }
  }
  const address = settings?.businessAddress?.trim() || settings?.address?.trim() || "";
  return address ? googleMapsDirectionsUrl(address) : "";
}
