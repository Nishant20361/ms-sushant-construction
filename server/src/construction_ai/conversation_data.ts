/**
 * Conversational dataset — small talk, construction sequence, suggested
 * questions and natural follow-up templates for the local rule-based assistant.
 *
 * Everything here is local/general construction knowledge. No external AI.
 */

// ---------------------------------------------------------------------------
// Suggested questions shown in the chat UI (with emoji + text buttons)
// ---------------------------------------------------------------------------
export const SUGGESTED_QUESTIONS: { label: string; message: string }[] = [
  { label: "🏠 40×35 घर का estimate", message: "40x35 ka ghar ka estimate do" },
  { label: "🧱 Cement कितना लगेगा?", message: "cement kitna lagega" },
  { label: "🔩 Steel कितना चाहिए?", message: "steel kitna lagega" },
  { label: "🏗️ Foundation में क्या लगता है?", message: "foundation me kya kya lagega" },
  { label: "🏠 Roof के लिए क्या चाहिए?", message: "roof banane me kya kya chahiye" },
  { label: "💧 Waterproofing कैसे करें?", message: "waterproofing kaise karein" },
  { label: "🧱 ACC F2R के बारे में बताओ", message: "ACC F2R ke bare me batao" },
  { label: "💰 Construction cost कितनी?", message: "construction cost kitni aayegi" },
];

// ---------------------------------------------------------------------------
// Small talk handling
// ---------------------------------------------------------------------------
export interface SmallTalkRule {
  /** Keywords that trigger this small-talk response (any-match). */
  triggers: string[];
  /** Reply templates can include {emoji}. Bilingual arrays. */
  repliesHi: string[];
  repliesEn: string[];
}

export const SMALL_TALK: SmallTalkRule[] = [
  {
    triggers: ["kaise ho", "how are you", "कैसे हो", "कैसे हैं", "kyse ho", "kese ho"],
    repliesHi: [
      "मैं बढ़िया हूँ 😊 बताइए, घर बनाने की planning चल रही है क्या?",
      "बहुत बढ़िया हूँ 😊 आप बताइए, किसी material या cost के बारे में जानना है?",
    ],
    repliesEn: [
      "I'm doing great 😊 Planning to build a home?",
      "I'm good 😊 Need any help with materials or cost?",
    ],
  },
  {
    triggers: ["accha", "achha", "acha", "ठीक", "theek", "ok", "okay", "haan", "hmm"],
    repliesHi: [
      "जी 😊 आप बस घर का size बता दीजिए, जैसे 40×35 ft. फिर मैं estimate निकाल दूँगा।",
      "ठीक है 👍 आपको किस चीज़ के बारे में और जानकारी चाहिए?",
    ],
    repliesEn: [
      "Sure 😊 Just share your house size, like 40×35 ft, and I'll estimate.",
      "Okay 👍 Anything else you'd like to know?",
    ],
  },
  {
    triggers: ["thank", "thanks", "धन्यवाद", "शुक्रिया", "thx"],
    repliesHi: [
      "आपका स्वागत है 😊 घर बनाने से जुड़ा कोई और सवाल हो तो पूछिए।",
      "जी धन्यवाद 🙏 और कोई construction जानकारी चाहिए तो बताइए।",
    ],
    repliesEn: [
      "You're welcome 😊 Feel free to ask anything else about construction.",
      "Thank you 🙏 Let me know if you need any more help.",
    ],
  },
  {
    triggers: ["bye", "goodbye", "अलविदा", "tta ta", "namaste ji"],
    repliesHi: [
      "अच्छा, धन्यवाद 🙏 घर बनाने में और मदद चाहिए तो फिर से पूछिए। शुभकामनाएँ!",
    ],
    repliesEn: [
      "Goodbye 🙏 Best wishes for your construction. Ask me anytime!",
    ],
  },
];

export function findSmallTalk(text: string): SmallTalkRule | null {
  const lower = text.toLowerCase();
  return SMALL_TALK.find((r) => r.triggers.some((t) => lower.includes(t.toLowerCase()))) ?? null;
}

// ---------------------------------------------------------------------------
// Construction sequence (foundation → roof) — general, factual
// ---------------------------------------------------------------------------
export interface ConstructionPhase {
  step: number;
  nameEn: string;
  nameHi: string;
  detailEn: string;
  detailHi: string;
}

export const CONSTRUCTION_SEQUENCE: ConstructionPhase[] = [
  {
    step: 1,
    nameEn: "Site preparation & marking",
    nameHi: "जगह की तैयारी और निशानदेही",
    detailEn: "Clearing, levelling and setting out the plot with reference lines.",
    detailHi: "साइट की सफाई, समतलीकरण और reference lines से layout तय करना।",
  },
  {
    step: 2,
    nameEn: "Excavation",
    nameHi: "खुदाई",
    detailEn: "Excavation of pits/trenches for foundation and footings.",
    detailHi: "नींव और फुटिंग के लिए गड्ढों/खाई की खुदाई।",
  },
  {
    step: 3,
    nameEn: "PCC bed",
    nameHi: "PCC बेड",
    detailEn: "A lean concrete levelling layer under the footings.",
    detailHi: "फुटिंग के नीचे समतल करने के लिए पतला कंक्रीट बेड।",
  },
  {
    step: 4,
    nameEn: "Footing & foundation",
    nameHi: "फुटिंग और नींव",
    detailEn: "RCC footings and foundation concreting as per design.",
    detailHi: "डिज़ाइन के अनुसार फुटिंग और नींव का कंक्रीटीकरण।",
  },
  {
    step: 5,
    nameEn: "Columns & plinth beam",
    nameHi: "कॉलम और प्लिंथ बीम",
    detailEn: "Column reinforcement, plinth beam and DPC.",
    detailHi: "कॉलम की सरिया, प्लिंथ बीम और DPC।",
  },
  {
    step: 6,
    nameEn: "Backfilling & floor",
    nameHi: "बैकफिलिंग और फर्श",
    detailEn: "Backfilling inside plinth and making the ground floor base.",
    detailHi: "प्लिंथ के अंदर बैकफिलिंग और जमीनी फर्श तैयार करना।",
  },
  {
    step: 7,
    nameEn: "Brick/block masonry",
    nameHi: "ईंट/ब्लॉक चिनाई",
    detailEn: "Building walls up to the sill/lintel level.",
    detailHi: "दीवारों को sill/लिंटर स्तर तक उठाना।",
  },
  {
    step: 8,
    nameEn: "Lintel & beams",
    nameHi: "लिंटर और बीम",
    detailEn: "Lintels above openings and RCC beams.",
    detailHi: "खुले स्थानों के ऊपर लिंटर और RCC बीम।",
  },
  {
    step: 9,
    nameEn: "Roof slab",
    nameHi: "छत स्लैब",
    detailEn: "Shuttering, reinforcement and slab concreting.",
    detailHi: "शटरिंग, सरिया और स्लैब कंक्रीटीकरण।",
  },
  {
    step: 10,
    nameEn: "Curing",
    nameHi: "क्योरिंग",
    detailEn: "Proper curing of all concrete members for strength.",
    detailHi: "सभी कंक्रीट members की strength के लिए उचित क्योरिंग।",
  },
  {
    step: 11,
    nameEn: "Plaster & finishing",
    nameHi: "प्लास्टर और फिनिशिंग",
    detailEn: "Internal/external plaster, flooring, tiling, painting.",
    detailHi: "अंदरूनी/बाहरी प्लास्टर, फर्श, टाइलिंग, पेंटिंग।",
  },
  {
    step: 12,
    nameEn: "Services & handover",
    nameHi: "सर्विसेज और हैंडओवर",
    detailEn: "Electrical, plumbing, fixtures and final handover.",
    detailHi: "बिजली, प्लंबिंग, फिटिंग और अंतिम हैंडओवर।",
  },
];

export function constructionSequenceReply(lang: "Hindi" | "English"): string {
  const lines: string[] = [];
  if (lang === "Hindi") {
    lines.push("🏗️ Foundation से roof तक सामान्य construction sequence:");
    lines.push("");
    for (const p of CONSTRUCTION_SEQUENCE) {
      lines.push(`${p.step}. ${p.nameHi} — ${p.detailHi}`);
    }
    lines.push("");
    lines.push("⚠️ यह सामान्य क्रम है। Actual sequence site, design और engineer के अनुसार बदल सकता है।");
  } else {
    lines.push("🏗️ General construction sequence from foundation to roof:");
    lines.push("");
    for (const p of CONSTRUCTION_SEQUENCE) {
      lines.push(`${p.step}. ${p.nameEn} — ${p.detailEn}`);
    }
    lines.push("");
    lines.push("⚠️ This is the general order. The actual sequence may vary by site, design and engineer.");
  }
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Natural response helpers
// ---------------------------------------------------------------------------

/** A friendly header line used when the assistant is about to give an estimate. */
export function estimateHeader(sessionLike: {
  dimensions?: { length: number; width: number; area: number } | null;
  floors?: number | null;
  quality?: string | null;
  totalArea?: number | null;
}, lang: "Hindi" | "English"): string {
  const d = sessionLike.dimensions;
  const floors = sessionLike.floors;
  const quality = sessionLike.quality;

  if (lang === "Hindi") {
    const sizeLine = d
      ? `आपके ${d.length}×${d.width} फीट${floors ? `, ${floors} floor` : ""} घर`
      : "आपके घर";
    const qLine = quality ? ` (${quality} quality)` : "";
    return `बिल्कुल 👍 ${sizeLine}${qLine} के लिए`;
  }
  const sizeLine = d
    ? `For your ${d.length}x${d.width} ft${floors ? `, ${floors} floor` : ""} home`
    : "For your home";
  const qLine = quality ? ` (${quality} quality)` : "";
  return `Sure 👍 ${sizeLine}${qLine}`;
}
