/**
 * Expanded construction material knowledge (Phase 13).
 *
 * Structured, bilingual, LOCAL rule-based dataset for:
 *  - Cement (OPC / PPC / PSC + application usage)
 *  - Steel (TMT / reinforcement / common Fe grades only as general notes)
 *  - Bricks (red brick / fly ash brick / AAC block / concrete block)
 *  - Sand (river sand / M-sand / plastering sand / concrete sand)
 *  - Aggregate (coarse aggregate sizes)
 *  - Roof (RCC slab / roofing sheet / waterproofing / insulation / drainage)
 *  - Waterproofing (roof / bathroom / terrace / foundation / crack treatment)
 *  - Finishing (plaster / putty / primer / paint / tiles / flooring)
 *
 * No external AI API. No invented brand-specific claims.
 */
export type KnowledgeCategory =
  | "cement"
  | "steel"
  | "bricks"
  | "sand"
  | "aggregate"
  | "roof"
  | "waterproofing"
  | "finishing";

export interface MaterialKnowledgeItem {
  id: string;
  category: KnowledgeCategory;
  nameEn: string;
  nameHi: string;
  /** Aliases / keywords used to detect this topic. */
  keywords: string[];
  benefitsEn: string[];
  benefitsHi: string[];
  usageEn: string[];
  usageHi: string[];
  notesEn: string[];
  notesHi: string[];
}

export const MATERIAL_KNOWLEDGE: MaterialKnowledgeItem[] = [
  // =====================================================================
  // CEMENT
  // =====================================================================
  {
    id: "cement_opc",
    category: "cement",
    nameEn: "OPC (Ordinary Portland Cement)",
    nameHi: "OPC सीमेंट",
    keywords: ["opc", "ordinary portland", "opc 43", "opc 53", "opc cement", "ओपीसी"],
    benefitsEn: [
      "Higher early strength, especially OPC 53.",
      "Suitable where higher strength is specified (slab, columns).",
      "Faster initial setting compared to some blended cements.",
    ],
    benefitsHi: [
      "विशेष रूप से OPC 53 में जल्दी और अधिक strength मिलती है।",
      "जहाँ अधिक strength चाहिए (slab, columns) वहाँ उपयुक्त है।",
      "कुछ blended cements की तुलना में तेजी से set होता है।",
    ],
    usageEn: [
      "RCC structural concrete (slab, beams, columns) where higher early strength is designed.",
      "Precast and high-strength concrete works.",
    ],
    usageHi: [
      "RCC structural concrete (स्लैब, बीम, कॉलम) जहाँ design में अधिक strength चाहिए।",
      "Precast और high-strength concrete के काम में।",
    ],
    notesEn: [
      "Grade (43 or 53) is decided by the structural design and engineer.",
      "Requires proper curing for strength development.",
    ],
    notesHi: [
      "Grade (43 या 53) structural design और engineer के अनुसार तय होता है।",
      "Strength के लिए उचित curing जरूरी है।",
    ],
  },
  {
    id: "cement_ppc",
    category: "cement",
    nameEn: "PPC (Portland Pozzolana Cement)",
    nameHi: "PPC सीमेंट",
    keywords: ["ppc", "portland pozzolana", "ppc cement", "पीपीसी"],
    benefitsEn: [
      "Good workability and lower heat of hydration.",
      "Good durability for general construction.",
      "Slightly lower early strength than OPC 53 but fine for most residential work.",
    ],
    benefitsHi: [
      "अच्छी workability और कम heat of hydration।",
      "सामान्य निर्माण के लिए अच्छी durability।",
      "OPC 53 से थोड़ी कम शुरुआती strength, पर अधिकतर residential काम के लिए ठीक।",
    ],
    usageEn: [
      "Plaster, masonry, mortar and general construction.",
      "Mass concrete and elements where lower heat is beneficial.",
    ],
    usageHi: [
      "प्लास्टर, चिनाई, mortar और सामान्य निर्माण।",
      "Mass concrete और जहाँ कम heat अच्छा हो।",
    ],
    notesEn: [
      "Common choice for plaster and masonry in residential projects.",
      "Final grade/type per engineer and structural design.",
    ],
    notesHi: [
      "Residential projects में plaster और masonry के लिए सामान्य विकल्प।",
      "अंतिम grade/type engineer और structural design के अनुसार।",
    ],
  },
  {
    id: "cement_psc",
    category: "cement",
    nameEn: "PSC (Portland Slag Cement)",
    nameHi: "PSC सीमेंट",
    keywords: ["psc", "portland slag", "slag cement", "पीएससी"],
    benefitsEn: [
      "Good durability and resistance in aggressive environments.",
      "Lower heat of hydration, good for mass concrete.",
      "Slightly lower early strength; strength builds steadily.",
    ],
    benefitsHi: [
      "अच्छी durability और aggressive environments में resistance।",
      "कम heat of hydration, mass concrete के लिए अच्छा।",
      "शुरुआती strength थोड़ी कम; strength धीरे-धीरे बढ़ती है।",
    ],
    usageEn: [
      "Marine structures, foundations and mass concrete.",
      "General RCC where the design permits.",
    ],
    usageHi: [
      "समुद्री structures, नींव और mass concrete।",
      "सामान्य RCC जहाँ design अनुमति दे।",
    ],
    notesEn: [
      "Use only if the structural engineer specifies a blended/slag cement.",
      "Curing period should be followed as per manufacturer guidance.",
    ],
    notesHi: [
      "तभी उपयोग करें जब structural engineer blended/slag cement निर्दिष्ट करे।",
      "Manufacturer की curing guidance का पालन करें।",
    ],
  },
  {
    id: "cement_selection",
    category: "cement",
    nameEn: "Cement selection guidance",
    nameHi: "सीमेंट चयन मार्गदर्शन",
    keywords: ["konsa cement", "which cement", "best cement", "good cement", "cement selection", "cement choose"],
    benefitsEn: [
      "OPC 53: high early strength — slab, columns, beams.",
      "PPC / OPC 43: plaster, masonry, flooring, general work.",
      "Match the grade/type to the structural design.",
    ],
    benefitsHi: [
      "OPC 53: जल्दी अधिक strength — स्लैब, कॉलम, बीम।",
      "PPC / OPC 43: प्लास्टर, चिनाई, फर्श, सामान्य काम।",
      "Grade/type को structural design से मिलाएं।",
    ],
    usageEn: ["General guidance for choosing between OPC and blended cements."],
    usageHi: ["OPC और blended cements में चुनाव के लिए सामान्य मार्गदर्शन।"],
    notesEn: [
      "Final cement grade is confirmed by the structural engineer.",
      "RCC uses a mix design; cement choice must match it.",
    ],
    notesHi: [
      "अंतिम cement grade structural engineer से confirm करें।",
      "RCC में mix design होता है; cement का चुनाव उसी से मेल खाना चाहिए।",
    ],
  },

  // =====================================================================
  // STEEL
  // =====================================================================
  {
    id: "steel_tmt",
    category: "steel",
    nameEn: "TMT steel bars",
    nameHi: "TMT सरिया",
    keywords: ["tmt", "sariya", "सरिया", "steel", "rebar", "reinforcement", "लोहा"],
    benefitsEn: [
      "High yield strength for RCC reinforcement.",
      "Good ductility and weldability (per grade).",
      "Commonly used in footings, columns, beams and slabs.",
    ],
    benefitsHi: [
      "RCC reinforcement के लिए उच्च yield strength।",
      "अच्छी ductility और weldability (grade के अनुसार)।",
      "फुटिंग, कॉलम, बीम और स्लैब में आम उपयोग।",
    ],
    usageEn: [
      "Reinforcement in RCC structural members.",
      "Grade (e.g. Fe500/Fe550D) and diameter from structural design.",
    ],
    usageHi: [
      "RCC structural members में reinforcement।",
      "Grade (जैसे Fe500/Fe550D) और diameter structural design से।",
    ],
    notesEn: [
      "Bar diameter and spacing are decided by the structural engineer.",
      "Store steel off the ground and keep it clean before use.",
    ],
    notesHi: [
      "Bar की diameter और spacing structural engineer तय करते हैं।",
      "सरिया को जमीन से ऊपर और साफ रखें।",
    ],
  },
  {
    id: "steel_grades",
    category: "steel",
    nameEn: "Common TMT grades (general note)",
    nameHi: "सामान्य TMT grades (सामान्य जानकारी)",
    keywords: ["fe500", "fe550", "fe550d", "fe415", "grade", "tmt grade"],
    benefitsEn: [
      "Fe415/Fe500/Fe550D indicate yield strength in N/mm² (general).",
      "Higher grade generally means higher strength per area.",
      "Selection is per structural design, not a simple choice.",
    ],
    benefitsHi: [
      "Fe415/Fe500/Fe550D yield strength (N/mm²) को दर्शाते हैं (सामान्य)।",
      "उच्च grade का मतलब आम तौर पर प्रति क्षेत्र अधिक strength।",
      "चुनाव structural design के अनुसार होता है, सरल choice नहीं।",
    ],
    usageEn: ["General understanding of Fe grades; not a design recommendation."],
    usageHi: ["Fe grades की सामान्य समझ; design recommendation नहीं।"],
    notesEn: [
      "Do not select a steel grade without the structural drawings.",
      "Grade and diameter are specified in the engineer's design.",
    ],
    notesHi: [
      "Structural drawings के बिना steel grade न चुनें।",
      "Grade और diameter engineer के design में निर्दिष्ट होते हैं।",
    ],
  },

  // =====================================================================
  // BRICKS
  // =====================================================================
  {
    id: "brick_red",
    category: "bricks",
    nameEn: "Red clay brick",
    nameHi: "लाल ईंट",
    keywords: ["red brick", "red clay", "लाल ईंट", "eent", "ईंट"],
    benefitsEn: [
      "Traditional, widely available and economical.",
      "Good compressive strength for load-bearing walls.",
      "Familiar to local masons.",
    ],
    benefitsHi: [
      "पारंपरिक, आसानी से उपलब्ध और किफायती।",
      "Load-bearing दीवारों के लिए अच्छी compressive strength।",
      "स्थानीय कारीगरों से परिचित।",
    ],
    usageEn: ["Load-bearing and partition walls, masonry."],
    usageHi: ["Load-bearing और partition दीवारें, चिनाई।"],
    notesEn: ["Soak bricks before use. Check quality (sound, shape, cracks)."],
    notesHi: ["उपयोग से पहले ईंटें भिगोएं। Quality (आवाज़, आकार, दरार) जांचें।"],
  },
  {
    id: "brick_flyash",
    category: "bricks",
    nameEn: "Fly ash brick",
    nameHi: "फ्लाई ऐश ईंट",
    keywords: ["fly ash", "flyash", "फ्लाई ऐश", "fly ash brick"],
    benefitsEn: [
      "Uniform size and smooth finish.",
      "Good strength with lower water absorption than some red bricks.",
      "Environment-friendly use of industrial by-product.",
    ],
    benefitsHi: [
      "एक समान आकार और चिकनी finish।",
      "कुछ लाल ईंटों की तुलना में कम water absorption और अच्छी strength।",
      "औद्योगिक by-product का पर्यावरण-अनुकूल उपयोग।",
    ],
    usageEn: ["Walls, masonry, pavements."],
    usageHi: ["दीवारें, चिनाई, फर्श।"],
    notesEn: ["Confirm quality and strength with the local manufacturer."],
    notesHi: ["स्थानीय manufacturer से quality और strength की पुष्टि करें।"],
  },
  {
    id: "brick_aac",
    category: "bricks",
    nameEn: "AAC block",
    nameHi: "AAC ब्लॉक",
    keywords: ["aac", "aac block", "foam block", "lightweight block", "एएसी"],
    benefitsEn: [
      "Lightweight, reducing structural load.",
      "Good thermal and sound insulation.",
      "Larger units speed up construction.",
    ],
    benefitsHi: [
      "हल्का, जिससे structural load कम होता है।",
      "अच्छा thermal और sound insulation।",
      "बड़े units से निर्माण तेज होता है।",
    ],
    usageEn: ["Partition and external walls (non-load-bearing typically)."],
    usageHi: ["Partition और बाहरी दीवारें (आमतौर पर non-load-bearing)।"],
    notesEn: [
      "Requires special block adhesive/mortar.",
      "Confirm structural suitability with the engineer for load-bearing use.",
    ],
    notesHi: [
      "विशेष block adhesive/mortar चाहिए।",
      "Load-bearing उपयोग के लिए engineer से structural suitability पुष्टि करें।",
    ],
  },
  {
    id: "brick_concrete",
    category: "bricks",
    nameEn: "Concrete / hollow block",
    nameHi: "कंक्रीट / होलो ब्लॉक",
    keywords: ["concrete block", "hollow block", "cement block", "कंक्रीट ब्लॉक"],
    benefitsEn: [
      "Durable and strong.",
      "Available in different sizes.",
      "Good for compound and structural walls.",
    ],
    benefitsHi: [
      "मजबूत और टिकाऊ।",
      "विभिन्न sizes में उपलब्ध।",
      "बाउंड्री और structural दीवारों के लिए अच्छा।",
    ],
    usageEn: ["Walls, boundary walls, load-bearing structures."],
    usageHi: ["दीवारें, बाउंड्री वॉल, load-bearing structures।"],
    notesEn: ["Check local availability, sizes and curing requirements."],
    notesHi: ["स्थानीय availability, sizes और curing आवश्यकताएं जांचें।"],
  },

  // =====================================================================
  // SAND
  // =====================================================================
  {
    id: "sand_river",
    category: "sand",
    nameEn: "River sand",
    nameHi: "रेत / नदी की रेत",
    keywords: ["river sand", "रेत", "balu", "बालू", "natural sand"],
    benefitsEn: [
      "Naturally graded, good for mortar and plaster.",
      "Well-known workability.",
      "Traditional choice in many regions.",
    ],
    benefitsHi: [
      "स्वाभाविक रूप से graded, mortar और plaster के लिए अच्छी।",
      "अच्छी workability।",
      "कई क्षेत्रों में पारंपरिक विकल्प।",
    ],
    usageEn: ["Concrete, mortar, plaster, brickwork, PCC."],
    usageHi: ["कंक्रीट, mortar, plaster, चिनाई, PCC।"],
    notesEn: ["Avoid sand with high silt/clay content; wash if needed."],
    notesHi: ["अधिक silt/mिट्टी वाली रेत से बचें; जरूरत पर धोएं।"],
  },
  {
    id: "sand_msand",
    category: "sand",
    nameEn: "M-Sand (manufactured sand)",
    nameHi: "एम सैंड / मशीन सैंड",
    keywords: ["m sand", "msand", "m-sand", "machine sand", "crusher sand", "एम सैंड"],
    benefitsEn: [
      "Easily available and consistent through controlled manufacturing.",
      "Good grading when produced properly.",
      "Used in concrete and masonry.",
    ],
    benefitsHi: [
      "आसानी से उपलब्ध और controlled manufacturing से consistency।",
      "सही बनने पर अच्छी grading।",
      "कंक्रीट और चिनाई में उपयोग।",
    ],
    usageEn: ["Concrete and masonry as an alternative to river sand."],
    usageHi: ["रेत के विकल्प के रूप में कंक्रीट और चिनाई में।"],
    notesEn: [
      "Check grading, dust content and quality before use.",
      "Quality and grading are very important.",
    ],
    notesHi: [
      "उपयोग से पहले grading, dust content और quality जांचें।",
      "Quality और grading बहुत महत्वपूर्ण है।",
    ],
  },
  {
    id: "sand_plastering",
    category: "sand",
    nameEn: "Plastering sand (fine)",
    nameHi: "प्लास्टर सैंड (महीन)",
    keywords: ["plaster sand", "plastering sand", "fine sand", "प्लास्टर सैंड"],
    benefitsEn: [
      "Fine, well-graded sand gives a smooth plaster finish.",
      "Low impurities for better plaster quality.",
    ],
    benefitsHi: [
      "महीन और अच्छी graded रेत से चिकनी plaster finish मिलती है।",
      "कम impurities से plaster quality बेहतर।",
    ],
    usageEn: ["Internal and external plaster."],
    usageHi: ["अंदरूनी और बाहरी plaster।"],
    notesEn: ["Use silt-free sand for plaster to avoid cracks."],
    notesHi: ["दरारों से बचने के लिए plaster में silt-free रेत उपयोग करें।"],
  },
  {
    id: "sand_concrete",
    category: "sand",
    nameEn: "Concrete sand (coarser)",
    nameHi: "कंक्रीट सैंड (मोटी)",
    keywords: ["concrete sand", "coarse sand", "कंक्रीट सैंड"],
    benefitsEn: [
      "Coarser particles help in concrete mix.",
      "Good for structural concrete when clean.",
    ],
    benefitsHi: [
      "मोटे particles कंक्रीट mix में मदद करते हैं।",
      "साफ होने पर structural concrete के लिए अच्छी।",
    ],
    usageEn: ["Structural concrete, PCC, RCC."],
    usageHi: ["Structural concrete, PCC, RCC।"],
    notesEn: ["Match sand to the concrete mix design."],
    notesHi: ["रेत को concrete mix design से मिलाएं।"],
  },

  // =====================================================================
  // AGGREGATE
  // =====================================================================
  {
    id: "aggregate_coarse",
    category: "aggregate",
    nameEn: "Coarse aggregate",
    nameHi: "मोटा गिट्टी / बजरी",
    keywords: ["aggregate", "gitti", "गिट्टी", "bajri", "बजरी", "coarse aggregate"],
    benefitsEn: [
      "Provides bulk and strength to concrete.",
      "Graded sizes improve the concrete matrix.",
      "Clean aggregate improves bonding with cement.",
    ],
    benefitsHi: [
      "कंक्रीट को bulk और strength देता है।",
      "Graded sizes से concrete matrix बेहतर होता है।",
      "साफ गिट्टी से cement के साथ bonding अच्छी।",
    ],
    usageEn: ["Concrete, PCC, RCC, flooring base."],
    usageHi: ["कंक्रीट, PCC, RCC, फर्श base।"],
    notesEn: ["Use graded and clean aggregate."],
    notesHi: ["Graded और साफ गिट्टी उपयोग करें।"],
  },
  {
    id: "aggregate_20mm",
    category: "aggregate",
    nameEn: "20mm aggregate",
    nameHi: "20mm गिट्टी",
    keywords: ["20mm", "20 mm", "20mm aggregate"],
    benefitsEn: [
      "Standard coarse aggregate for RCC members.",
      "Balanced size for beams, columns and slabs.",
    ],
    benefitsHi: [
      "RCC members के लिए मानक coarse aggregate।",
      "बीम, कॉलम और स्लैब के लिए संतुलित आकार।",
    ],
    usageEn: ["RCC structural concrete."],
    usageHi: ["RCC structural concrete।"],
    notesEn: ["Use per the concrete mix design."],
    notesHi: ["Concrete mix design के अनुसार उपयोग करें।"],
  },
  {
    id: "aggregate_10mm",
    category: "aggregate",
    nameEn: "10mm aggregate",
    nameHi: "10mm गिट्टी",
    keywords: ["10mm", "10 mm", "10mm aggregate"],
    benefitsEn: [
      "Finer coarse aggregate for thin sections.",
      "Good for flooring base and finishing.",
    ],
    benefitsHi: [
      "पतले sections के लिए बारीक coarse aggregate।",
      "फर्श base और finishing के लिए अच्छी।",
    ],
    usageEn: ["Thin sections, flooring, grit."],
    usageHi: ["पतले sections, फर्श, grit।"],
    notesEn: ["Often mixed with 20mm in concrete."],
    notesHi: ["अक्सर कंक्रीट में 20mm के साथ मिलाई जाती है।"],
  },

  // =====================================================================
  // ROOF
  // =====================================================================
  {
    id: "roof_rcc",
    category: "roof",
    nameEn: "RCC slab roof",
    nameHi: "RCC स्लैब छत",
    keywords: ["rcc roof", "rcc slab", "slab", "स्लैब", "roof cast"],
    benefitsEn: [
      "Strong permanent structure.",
      "Suitable for multi-storey residential buildings.",
      "Flat usable terrace.",
    ],
    benefitsHi: [
      "मजबूत स्थायी structure।",
      "बहुमंजिला residential भवनों के लिए उपयुक्त।",
      "सपाट उपयोग योग्य छत।",
    ],
    usageEn: ["Permanent residential and commercial roofs."],
    usageHi: ["स्थायी residential और commercial छतें।"],
    notesEn: [
      "Requires structural design (slab thickness, reinforcement).",
      "Higher construction complexity and cost than sheet roofing.",
    ],
    notesHi: [
      "Structural design चाहिए (slab thickness, reinforcement)।",
      "Sheet roofing की तुलना में अधिक जटिलता और लागत।",
    ],
  },
  {
    id: "roof_sheet",
    category: "roof",
    nameEn: "Roofing sheet",
    nameHi: "रूफिंग शीट / छत की चादर",
    keywords: ["roofing sheet", "roof sheet", "sheet roof", "छत की चादर", "रूफिंग शीट"],
    benefitsEn: [
      "Lightweight.",
      "Fast installation.",
      "Suitable for sheds, carports and certain structures.",
    ],
    benefitsHi: [
      "हल्का।",
      "तेजी से install होता है।",
      "शेड, कारपोर्ट और कुछ structures के लिए उपयुक्त।",
    ],
    usageEn: ["Sheds, carports, temporary or sloped roofs."],
    usageHi: ["शेड, कारपोर्ट, अस्थायी या ढलान वाली छत।"],
    notesEn: [
      "Add overlap and ridge allowance.",
      "Insulation and weather considerations required.",
    ],
    notesHi: [
      "Overlap और ridge allowance जोड़ें।",
      "Insulation और weather considerations जरूरी।",
    ],
  },
  {
    id: "roof_waterproofing",
    category: "roof",
    nameEn: "Roof waterproofing",
    nameHi: "छत वॉटरप्रूफिंग",
    keywords: ["roof waterproofing", "छत वॉटरप्रूफिंग", "terrace waterproofing"],
    benefitsEn: [
      "Prevents seepage and leakage.",
      "Protects the slab from moisture damage.",
      "Extends the life of the roof.",
    ],
    benefitsHi: [
      "Seepage और leakage रोकता है।",
      "Slab को नमी से बचाता है।",
      "छत की उम्र बढ़ाता है।",
    ],
    usageEn: ["RCC roofs, terraces, bathrooms, foundations."],
    usageHi: ["RCC छतें, terraces, बाथरूम, नींव।"],
    notesEn: ["Coverage depends on the manufacturer's product and coats."],
    notesHi: ["Coverage manufacturer के product और coats पर निर्भर।"],
  },
  {
    id: "roof_insulation",
    category: "roof",
    nameEn: "Roof insulation",
    nameHi: "छत insulation",
    keywords: ["insulation", "heat proof", "इंसुलेशन", "thermocol", "heat resistant"],
    benefitsEn: [
      "Reduces heat transfer from the roof.",
      "Lowers cooling load and energy cost.",
      "Improves comfort in upper floors.",
    ],
    benefitsHi: [
      "छत से heat transfer कम करता है।",
      "Cooling load और बिजली खर्च घटाता है।",
      "ऊपरी मंजिलों में आराम बढ़ाता है।",
    ],
    usageEn: ["RCC roofs and terraces, especially top floors."],
    usageHi: ["RCC छतें और terraces, खासकर ऊपरी मंजिलें।"],
    notesEn: ["Combine with waterproofing for best results."],
    notesHi: ["सर्वोत्तम परिणाम के लिए waterproofing के साथ करें।"],
  },
  {
    id: "roof_drainage",
    category: "roof",
    nameEn: "Roof drainage",
    nameHi: "छत drainage",
    keywords: ["drainage", "drain", "rain water", "नाली", "water logging"],
    benefitsEn: [
      "Prevents water logging on the roof.",
      "Protects waterproofing and slab.",
      "Directs rain water away from walls.",
    ],
    benefitsHi: [
      "छत पर पानी जमने से रोकता है।",
      "Waterproofing और slab की रक्षा करता है।",
      "बारिश का पानी दीवारों से दूर करता है।",
    ],
    usageEn: ["Roof slopes, downpipes, drainage outlets."],
    usageHi: ["छत की ढलान, downpipes, drainage outlets।"],
    notesEn: ["Proper slope and outlet size are important."],
    notesHi: ["सही ढलान और outlet size महत्वपूर्ण है।"],
  },

  // =====================================================================
  // WATERPROOFING
  // =====================================================================
  {
    id: "wp_roof",
    category: "waterproofing",
    nameEn: "Roof waterproofing",
    nameHi: "छत वॉटरप्रूफिंग",
    keywords: ["roof waterproofing", "roof leakage", "छत में पानी", "छत की सीलन"],
    benefitsEn: [
      "Stops roof leakage and seepage.",
      "Protects the RCC slab from weathering.",
      "Increases roof life.",
    ],
    benefitsHi: [
      "छत की leakage और seepage रोकता है।",
      "RCC slab को मौसम से बचाता है।",
      "छत की उम्र बढ़ाता है।",
    ],
    usageEn: ["RCC roofs and terraces."],
    usageHi: ["RCC छतें और terraces।"],
    notesEn: ["Apply on a clean, cured surface."],
    notesHi: ["साफ और cured सतह पर लगाएं।"],
  },
  {
    id: "wp_bathroom",
    category: "waterproofing",
    nameEn: "Bathroom waterproofing",
    nameHi: "बाथरूम वॉटरप्रूफिंग",
    keywords: ["bathroom waterproofing", "bathroom leakage", "बाथरूम में पानी"],
    benefitsEn: [
      "Prevents water seepage to other rooms.",
      "Protects tiles and walls from dampness.",
      "Essential below floor and wall tiles.",
    ],
    benefitsHi: [
      "पानी को दूसरे कमरों में जाने से रोकता है।",
      "टाइल और दीवारों को नमी से बचाता है।",
      "फर्श और दीवार टाइल के नीचे जरूरी।",
    ],
    usageEn: ["Bathroom floors, walls, shower areas."],
    usageHi: ["बाथरूम फर्श, दीवारें, shower areas।"],
    notesEn: ["Do before tiling for best results."],
    notesHi: ["टाइलिंग से पहले करें, सर्वोत्तम परिणाम के लिए।"],
  },
  {
    id: "wp_terrace",
    category: "waterproofing",
    nameEn: "Terrace waterproofing",
    nameHi: "टेरेस वॉटरप्रूफिंग",
    keywords: ["terrace waterproofing", "terrace", "टेरेस"],
    benefitsEn: [
      "Protects exposed terrace from rain and heat.",
      "Prevents ceiling leakage on the floor below.",
      "Long-term protection for the slab.",
    ],
    benefitsHi: [
      "खुली terrace को बारिश और गर्मी से बचाता है।",
      "नीचे की मंजिल की छत में leakage रोकता है।",
      "Slab की दीर्घकालिक सुरक्षा।",
    ],
    usageEn: ["Exposed terraces and balconies."],
    usageHi: ["खुली terraces और balconies।"],
    notesEn: ["Combine with insulation if heat is a concern."],
    notesHi: ["गर्मी की चिंता हो तो insulation के साथ करें।"],
  },
  {
    id: "wp_foundation",
    category: "waterproofing",
    nameEn: "Foundation / DPC waterproofing",
    nameHi: "नींव / DPC वॉटरप्रूफिंग",
    keywords: ["foundation waterproofing", "dpc", "damp proof", "नमी रोक"],
    benefitsEn: [
      "Stops rising damp in walls.",
      "Protects foundation from moisture.",
      "Prevents damp-related plaster and paint damage.",
    ],
    benefitsHi: [
      "दीवारों में rising damp रोकता है।",
      "नींव को नमी से बचाता है।",
      "Damp से plaster और paint की खराबी रोकता है।",
    ],
    usageEn: ["DPC at plinth level, basement, below-ground structures."],
    usageHi: ["Plinth level पर DPC, basement, जमीन के नीचे structures।"],
    notesEn: ["Layer height and material per design and site condition."],
    notesHi: ["परत की ऊंचाई और material design और site condition के अनुसार।"],
  },
  {
    id: "wp_crack",
    category: "waterproofing",
    nameEn: "Crack treatment",
    nameHi: "दरार उपचार",
    keywords: ["crack treatment", "crack", "दरार", "cracks in wall"],
    benefitsEn: [
      "Seals structural and non-structural cracks.",
      "Prevents water entry through cracks.",
      "Prepares the surface before coating.",
    ],
    benefitsHi: [
      "Structural और non-structural दरारें सील करता है।",
      "दरारों से पानी का प्रवेश रोकता है।",
      "Coating से पहले सतह तैयार करता है।",
    ],
    usageEn: ["Walls, slabs, roof surfaces before waterproofing."],
    usageHi: ["दीवारें, स्लैब, waterproofing से पहले छत की सतह।"],
    notesEn: ["Serious structural cracks must be checked by an engineer."],
    notesHi: ["गंभीर structural दरारें engineer से जांचें।"],
  },

  // =====================================================================
  // FINISHING
  // =====================================================================
  {
    id: "finish_plaster",
    category: "finishing",
    nameEn: "Plaster",
    nameHi: "प्लास्टर",
    keywords: ["plaster", "प्लास्टर", "wall plaster", "cement plaster"],
    benefitsEn: [
      "Provides a smooth base for paint and tiles.",
      "Protects walls from weather.",
      "Hides brickwork irregularities.",
    ],
    benefitsHi: [
      "पेंट और टाइल के लिए चिकना base देता है।",
      "दीवारों को मौसम से बचाता है।",
      "चिनाई की खामियां छुपाता है।",
    ],
    usageEn: ["Internal and external walls, ceilings."],
    usageHi: ["अंदरूनी और बाहरी दीवारें, छत।"],
    notesEn: ["Mix ratio and thickness depend on surface and exposure."],
    notesHi: ["Mix ratio और thickness सतह और exposure पर निर्भर।"],
  },
  {
    id: "finish_putty",
    category: "finishing",
    nameEn: "Wall putty",
    nameHi: "वॉल पुट्टी",
    keywords: ["putty", "wall putty", "पुट्टी"],
    benefitsEn: [
      "Smooths the wall surface before painting.",
      "Better paint finish and coverage.",
      "Hides minor surface imperfections.",
    ],
    benefitsHi: [
      "पेंटिंग से पहले दीवार की सतह चिकनी करता है।",
      "बेहतर paint finish और coverage।",
      "हल्की सतह खामियां छुपाता है।",
    ],
    usageEn: ["Interior walls before primer/paint."],
    usageHi: ["प्राइमर/पेंट से पहले अंदरूनी दीवारें।"],
    notesEn: ["Coverage varies by brand and number of coats."],
    notesHi: ["Coverage brand और coats की संख्या पर निर्भर।"],
  },
  {
    id: "finish_primer",
    category: "finishing",
    nameEn: "Primer",
    nameHi: "प्राइमर",
    keywords: ["primer", "प्राइमर"],
    benefitsEn: [
      "Seals the wall surface.",
      "Improves paint adhesion.",
      "Reduces paint consumption.",
    ],
    benefitsHi: [
      "दीवार की सतह seal करता है।",
      "Paint की adhesion बेहतर करता है।",
      "Paint की खपत घटाता है।",
    ],
    usageEn: ["Base coat on walls/ceiling before paint."],
    usageHi: ["पेंट से पहले दीवार/छत पर base coat।"],
    notesEn: ["Choose primer type based on the paint system."],
    notesHi: ["Paint system के अनुसार primer type चुनें।"],
  },
  {
    id: "finish_paint",
    category: "finishing",
    nameEn: "Paint",
    nameHi: "पेंट",
    keywords: ["paint", "पेंट", "interior paint", "exterior paint", "emulsion"],
    benefitsEn: [
      "Protects walls and adds colour.",
      "Interior paint for living spaces.",
      "Exterior paint resists weather.",
    ],
    benefitsHi: [
      "दीवारों की सुरक्षा और रंग।",
      "रहने की जगहों के लिए interior paint।",
      "Exterior paint मौसम से बचाता है।",
    ],
    usageEn: ["Interior and exterior walls, ceilings."],
    usageHi: ["अंदरूनी और बाहरी दीवारें, छत।"],
    notesEn: ["Coverage varies by brand, surface and coats."],
    notesHi: ["Coverage brand, सतह और coats पर निर्भर।"],
  },
  {
    id: "finish_tiles",
    category: "finishing",
    nameEn: "Tiles",
    nameHi: "टाइल",
    keywords: ["tiles", "टाइल", "floor tiles", "wall tiles", "vitrified"],
    benefitsEn: [
      "Durable and easy to clean.",
      "Wide range of sizes and finishes.",
      "Suitable for floors and walls.",
    ],
    benefitsHi: [
      "टिकाऊ और साफ करने में आसान।",
      "विभिन्न sizes और finishes।",
      "फर्श और दीवारों के लिए उपयुक्त।",
    ],
    usageEn: ["Flooring, bathroom, kitchen, walls."],
    usageHi: ["फर्श, बाथरूम, रसोई, दीवारें।"],
    notesEn: ["Add 5-10% wastage for cutting/breakage."],
    notesHi: ["कटाई/टूटने के लिए 5-10% extra।"],
  },
  {
    id: "finish_flooring",
    category: "finishing",
    nameEn: "Flooring",
    nameHi: "फर्श / फ्लोरिंग",
    keywords: ["flooring", "फर्श", "floor", "granite", "marble"],
    benefitsEn: [
      "Completes the living surface.",
      "Options: tiles, granite, marble, etc.",
      "Adds durability and aesthetics.",
    ],
    benefitsHi: [
      "रहने की सतह पूरी करता है।",
      "विकल्प: टाइल, ग्रेनाइट, मार्बल आदि।",
      "टिकाऊ और सुंदर।",
    ],
    usageEn: ["Floors, stairs, kitchen platforms."],
    usageHi: ["फर्श, सीढ़ियां, रसोई platform।"],
    notesEn: ["Material choice depends on budget and use."],
    notesHi: ["Material चुनाव budget और उपयोग पर निर्भर।"],
  },
];

/** Find material knowledge items whose keywords match the text (any match). */
export function findMaterialKnowledge(text: string): MaterialKnowledgeItem[] {
  const lower = text.toLowerCase();
  const hits: MaterialKnowledgeItem[] = [];
  for (const item of MATERIAL_KNOWLEDGE) {
    if (item.keywords.some((k) => lower.includes(k.toLowerCase()))) {
      hits.push(item);
    }
  }
  return hits;
}

