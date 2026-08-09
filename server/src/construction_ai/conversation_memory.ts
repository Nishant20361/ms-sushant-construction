/**
 * Conversation Memory — the enriched session state used by the conversational
 * construction assistant.
 *
 * This module owns the extended memory fields (dimensions, floors, quality,
 * total area, rooms, bathrooms, roof/foundation, material preferences, etc.)
 * so the assistant remembers everything the customer has said during the
 * current chat and never re-asks for already-known information.
 */
import { BuildQuality } from "./dataset.js";

export type AssistantLanguage = "Hindi" | "English";

export interface Dimensions {
  length: number;
  width: number;
  area: number;
  raw: string;
}

export interface SessionData {
  language: AssistantLanguage;
  dimensions: Dimensions | null;
  floors: number | null;
  quality: BuildQuality | null;
  /** Pending intent that needs the house area/floors before it can be answered. */
  pendingIntent: string | null;
  /** Location/city if the user mentioned one. */
  location: string | null;

  // ---- Extended conversation memory ----
  /** Built-up area = length × width × floors (null until floors known). */
  totalArea: number | null;
  rooms: number | null;
  kitchens: number | null;
  bathrooms: number | null;
  roofType: string | null;
  foundationType: string | null;
  materialPref: string | null;
  cementProduct: string | null;
  /** Last answered material/topic so the assistant can offer a natural next step. */
  lastTopic: string | null;
  /** Whether the assistant has already said the welcome greeting. */
  greeted: boolean;

  // ---- PART 2 additions (Phases 11-30) ----
  /** Current consultation intent (e.g. "build_new_house", "renovate", "roof", "foundation", etc.). */
  consultIntent: string | null;
  /** Step within the consultation flow. */
  consultStep: string | null;

  // Room-based estimation (Phase 12)
  bedrooms: number | null;
  halls: number | null;
  stores: number | null;
  balconies: number | null;
  verandas: number | null;
  staircases: number | null;
  /** Whether the user described their house via rooms (e.g. "3 room 1 kitchen 2 bathroom"). */
  roomBased: boolean;

  // Roof type query (Phase 11)
  /** "rcc" or "sheet" or null. */
  roofTypeDetail: string | null;

  // Boundary wall (Phase 11)
  boundaryWall: boolean;

  /** Whether the assistant already asked location for cost. */
  askedLocationForCost: boolean;

  /** Last product looked up (for follow-up). */
  lastProduct: string | null;
}

/** Compute the total built-up area from the remembered dimensions + floors. */
export function getTotalArea(s: SessionData): number | null {
  if (!s.dimensions) return null;
  return s.dimensions.area * (s.floors ?? 1);
}

export function createInitialSession(lang: AssistantLanguage): SessionData {
  return {
    language: lang,
    dimensions: null,
    floors: null,
    quality: null,
    pendingIntent: null,
    location: null,
    totalArea: null,
    rooms: null,
    kitchens: null,
    bathrooms: null,
    roofType: null,
    foundationType: null,
    materialPref: null,
    cementProduct: null,
    lastTopic: null,
    greeted: false,
    consultIntent: null,
    consultStep: null,
    bedrooms: null,
    halls: null,
    stores: null,
    balconies: null,
    verandas: null,
    staircases: null,
    roomBased: false,
    roofTypeDetail: null,
    boundaryWall: false,
    askedLocationForCost: false,
    lastProduct: null,
  };
}
