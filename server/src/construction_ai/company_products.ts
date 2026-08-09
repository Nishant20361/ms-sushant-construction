/**
 * Company / product aggregation for the construction assistant.
 *
 * This module provides a lightweight, dataset-driven view of the cement
 * companies and their commonly known product families so the assistant can
 * answer "what products does company X offer" naturally.
 */
import { CEMENT_COMPANIES } from "./dataset.js";

export interface CompanyProductListing {
  company: string;
  products: string[];
  /** Regional/availability note (general, factual). */
  availabilityEn: string;
  availabilityHi: string;
}

export const COMPANY_PRODUCTS: CompanyProductListing[] = CEMENT_COMPANIES.map((c) => ({
  company: c.name,
  products: [...c.products],
  availabilityEn: "Availability varies by region; confirm with your local dealer.",
  availabilityHi: "उपलब्धता क्षेत्र के अनुसार बदलती है; स्थानीय dealer से पुष्टि करें।",
}));

export function findCompanyProducts(name: string): CompanyProductListing | null {
  const lower = name.toLowerCase();
  return (
    COMPANY_PRODUCTS.find((p) => p.company.toLowerCase() === lower) ??
    COMPANY_PRODUCTS.find((p) => p.company.toLowerCase().includes(lower)) ??
    null
  );
}
