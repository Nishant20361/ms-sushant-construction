/**
 * Materials dataset (modular re-export).
 *
 * The full material catalogue lives in dataset.ts; this module re-exports the
 * material-related structures so the assistant can import only what it needs.
 */
import {
  MATERIALS,
  MaterialInfo,
  MATERIAL_RATES,
  MaterialRate,
} from "./dataset.js";

export { MATERIALS, MATERIAL_RATES };
export type { MaterialInfo, MaterialRate };

/** Find a material by id. */
export function findMaterial(id: string): MaterialInfo | null {
  return MATERIALS.find((m) => m.id === id) ?? null;
}
