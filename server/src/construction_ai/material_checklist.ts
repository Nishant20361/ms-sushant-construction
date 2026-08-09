/**
 * Material checklist dataset (Phase 20).
 *
 * An organized, stage-wise construction material checklist. These are general
 * planning lists — final quantities depend on the structure, design and site.
 */
export interface ChecklistSection {
  id: string;
  titleEn: string;
  titleHi: string;
  itemsEn: string[];
  itemsHi: string[];
}

export const MATERIAL_CHECKLIST: ChecklistSection[] = [
  {
    id: "foundation",
    titleEn: "FOUNDATION",
    titleHi: "नींव",
    itemsEn: [
      "Cement",
      "Steel",
      "Sand",
      "Aggregate",
      "Bricks/blocks",
      "Binding wire",
      "Waterproofing materials where required",
    ],
    itemsHi: [
      "सीमेंट",
      "सरिया / स्टील",
      "रेत",
      "गिट्टी",
      "ईंट / ब्लॉक",
      "बाइंडिंग तार",
      "जहाँ आवश्यक हो वॉटरप्रूफिंग सामग्री",
    ],
  },
  {
    id: "structure",
    titleEn: "STRUCTURE",
    titleHi: "संरचना (कॉलम/बीम)",
    itemsEn: [
      "Cement",
      "Steel",
      "Sand",
      "Aggregate",
      "Binding wire",
      "Shuttering-related materials",
    ],
    itemsHi: [
      "सीमेंट",
      "सरिया / स्टील",
      "रेत",
      "गिट्टी",
      "बाइंडिंग तार",
      "शटरिंग सामग्री",
    ],
  },
  {
    id: "brickwork",
    titleEn: "BRICKWORK",
    titleHi: "चिनाई",
    itemsEn: ["Bricks/blocks", "Cement", "Sand"],
    itemsHi: ["ईंट / ब्लॉक", "सीमेंट", "रेत"],
  },
  {
    id: "plaster",
    titleEn: "PLASTER",
    titleHi: "प्लास्टर",
    itemsEn: ["Cement", "Fine sand/M-sand", "Water"],
    itemsHi: ["सीमेंट", "महीन रेत / एम सैंड", "पानी"],
  },
  {
    id: "roof",
    titleEn: "ROOF",
    titleHi: "छत",
    itemsEn: ["Cement", "Steel", "Sand", "Aggregate", "Waterproofing system"],
    itemsHi: ["सीमेंट", "सरिया", "रेत", "गिट्टी", "वॉटरप्रूफिंग सिस्टम"],
  },
  {
    id: "finishing",
    titleEn: "FINISHING",
    titleHi: "फिनिशिंग",
    itemsEn: ["Putty", "Primer", "Paint", "Tiles", "Adhesive", "Grout"],
    itemsHi: ["पुट्टी", "प्राइमर", "पेंट", "टाइल", "एडहेसिव", "ग्राउट"],
  },
  {
    id: "electrical",
    titleEn: "ELECTRICAL",
    titleHi: "बिजली",
    itemsEn: ["Wires", "Switches", "MCB", "Distribution board", "Conduits"],
    itemsHi: ["वायर", "स्विच", "MCB", "डिस्ट्रीब्यूशन बोर्ड", "कंड्यूट"],
  },
  {
    id: "plumbing",
    titleEn: "PLUMBING",
    titleHi: "प्लंबिंग",
    itemsEn: ["Pipes", "Fittings", "Valves", "Fixtures"],
    itemsHi: ["पाइप", "फिटिंग", "वाल्व", "फिक्स्चर"],
  },
];

/** Build a full bilingual checklist reply. */
export function buildChecklistReply(lang: "Hindi" | "English"): string {
  const lines: string[] = [];
  if (lang === "Hindi") {
    lines.push("🏗️ घर बनाने के लिए सामान्य material checklist:");
    lines.push("");
    for (const s of MATERIAL_CHECKLIST) {
      lines.push(`📦 ${s.titleHi}:`);
      s.itemsHi.forEach((item) => lines.push(`   • ${item}`));
      lines.push("");
    }
    lines.push(
      "⚠️ यह सामान्य checklist है। Actual quantities structural design और site के अनुसार बदलती हैं।"
    );
  } else {
    lines.push("🏗️ General material checklist for building a house:");
    lines.push("");
    for (const s of MATERIAL_CHECKLIST) {
      lines.push(`📦 ${s.titleEn}:`);
      s.itemsEn.forEach((item) => lines.push(`   • ${item}`));
      lines.push("");
    }
    lines.push(
      "⚠️ This is a general checklist. Actual quantities vary by structural design and site."
    );
  }
  return lines.join("\n");
}
