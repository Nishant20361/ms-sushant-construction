/**
 * Seed script for the Construction Knowledge database (Phase 5 — RAG).
 *
 * Inserts 55+ realistic construction-knowledge records into the
 * `ConstructionKnowledge` table. Each record is general, factual guidance
 * (no fake technical claims). Run with: npm run db:seed:knowledge
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface SeedRecord {
  category: string;
  title: string;
  content: string;
  keywords: string[];
  materialType?: string | null;
  companyName?: string | null;
}

const RECORDS: SeedRecord[] = [
  // ======================================================================
  // CEMENT
  // ======================================================================
  {
    category: "cement",
    title: "ACC F2R",
    content:
      "ACC F2R is a fast-strength cement from ACC.\n\nSuitable work:\n- RCC work, columns, beams and slabs\n- Quick-setting applications\n\nBenefits:\n- Faster early strength\n- Good workability\n- Suitable for construction projects\n\nNot recommended:\n- Large pours where long working time is needed\n\nNote: Confirm the exact product grade and strength with your local dealer and match it to the structural design.",
    keywords: ["acc f2r", "acc", "f2r", "cement", "सीमेंट", "acc f2r ke fayde", "acc fast strength"],
    materialType: "cement",
    companyName: "ACC",
  },
  {
    category: "cement",
    title: "ACC Concreto",
    content:
      "ACC Concreto is a high-strength blended cement from ACC.\n\nSuitable work:\n- RCC slabs, beams and columns\n- Structural concrete\n\nBenefits:\n- Consistent strength\n- Good for structural concrete\n\nNot recommended:\n- Confirm the mix design with your engineer before use.\n\nNote: Grade and mix design should be verified with the structural engineer.",
    keywords: ["acc concreto", "concreto", "acc", "cement", "सीमेंट", "high strength cement"],
    materialType: "cement",
    companyName: "ACC",
  },
  {
    category: "cement",
    title: "UltraTech Cement",
    content:
      "UltraTech is one of the largest cement producers in India.\n\nSuitable work:\n- Residential concrete (slabs, columns)\n- Plaster and masonry\n\nBenefits:\n- Broad product range\n- Consistent quality\n- Wide availability\n\nNot recommended:\n- Choose the correct OPC/PPC grade per the structural design.\n\nNote: Match the grade to the concrete mix design.",
    keywords: ["ultratech", "ultra tech", "ultra", "cement", "सीमेंट", "ultratech cement"],
    materialType: "cement",
    companyName: "UltraTech",
  },
  {
    category: "cement",
    title: "Nuvoco Cement",
    content:
      "Nuvoco offers a broad portfolio of cement and building products.\n\nSuitable work:\n- High-strength concrete\n- Residential and infrastructure projects\n\nBenefits:\n- High-strength and specialty cements\n- Good availability\n\nNot recommended:\n- Verify the specific product and grade for your application.\n\nNote: Confirm product availability and grade with your local dealer.",
    keywords: ["nuvoco", "nuvoco cement", "cement", "सीमेंट", "nuvoco vistas", "concreto uno"],
    materialType: "cement",
    companyName: "Nuvoco",
  },
  {
    category: "cement",
    title: "PPC (Portland Pozzolana Cement)",
    content:
      "PPC is a blended cement with good durability and lower heat of hydration.\n\nSuitable work:\n- Plaster\n- Masonry\n- General construction\n\nBenefits:\n- Good workability\n- Lower heat of hydration\n- Good durability\n\nNot recommended:\n- Where very high early strength is required (use OPC 53 instead).\n\nNote: Final grade/type per engineer and structural design.",
    keywords: ["ppc", "portland pozzolana", "ppc cement", "cement", "सीमेंट", "ppc vs opc"],
    materialType: "cement",
  },
  {
    category: "cement",
    title: "OPC 43 Grade Cement",
    content:
      "OPC 43 is Ordinary Portland Cement with moderate early strength.\n\nSuitable work:\n- General concrete\n- Plaster and masonry\n- PCC\n\nBenefits:\n- Moderate strength\n- Good for general work\n\nNot recommended:\n- Where high early strength is specified (use OPC 53).\n\nNote: Match the grade to the structural requirement.",
    keywords: ["opc 43", "opc43", "opc", "cement", "सीमेंट", "opc 43 grade"],
    materialType: "cement",
  },
  {
    category: "cement",
    title: "OPC 53 Grade Cement",
    content:
      "OPC 53 is Ordinary Portland Cement with higher early strength.\n\nSuitable work:\n- RCC slabs, beams and columns\n- High-strength concrete\n\nBenefits:\n- Higher early strength\n- Good for structural elements\n\nNot recommended:\n- Confirm the mix design before use.\n\nNote: Higher strength does not mean it fits every job — follow the structural design.",
    keywords: ["opc 53", "opc53", "opc", "cement", "सीमेंट", "opc 53 grade", "high strength"],
    materialType: "cement",
  },
  {
    category: "cement",
    title: "PSC (Portland Slag Cement)",
    content:
      "PSC is a blended cement made with slag, giving good durability.\n\nSuitable work:\n- Marine structures\n- Mass concrete\n- Foundations\n\nBenefits:\n- Good durability in aggressive environments\n- Lower heat of hydration\n\nNot recommended:\n- Use only if the structural engineer specifies a blended/slag cement.\n\nNote: Strength builds steadily; follow curing guidance.",
    keywords: ["psc", "portland slag", "slag cement", "cement", "सीमेंट", "psc cement"],
    materialType: "cement",
  },
  {
    category: "cement",
    title: "Cement Selection Guide",
    content:
      "How to choose cement:\n\n- OPC 53: high early strength — slab, columns, beams.\n- PPC / OPC 43: plaster, masonry, flooring, general work.\n- PSC: marine/mass concrete, if specified.\n\nBenefits:\n- Choosing the right grade improves strength and durability.\n- Reduces risk of cracks and under-strength concrete.\n\nNot recommended:\n- Do not choose a grade without the structural design.\n\nNote: The final grade is confirmed by the structural engineer.",
    keywords: ["konsa cement", "which cement", "cement selection", "best cement", "good cement", "cement choose", "सीमेंट कौन सा अच्छा है"],
    materialType: "cement",
  },
  {
    category: "cement",
    title: "OPC vs PPC Comparison",
    content:
      "Comparison: OPC vs PPC\n\nOPC:\n- Higher early strength (OPC 53)\n- Good for structural concrete (slab, columns)\n- Higher heat of hydration\n\nPPC:\n- Lower early strength but good durability\n- Lower heat of hydration\n- Good for plaster, masonry and general work\n\nWhich is better?\n- OPC 53 for high-early-strength structural elements.\n- PPC for plaster, masonry and general residential work.\n\nNote: Final choice depends on the structural design.",
    keywords: ["opc vs ppc", "opc vs ppc comparison", "ppc vs opc", "which cement better", "opc ppc difference"],
    materialType: "cement",
  },

  // ======================================================================
  // STEEL
  // ======================================================================
  {
    category: "steel",
    title: "Tata TMT",
    content:
      "Tata TMT bars are widely used for RCC reinforcement in India.\n\nSuitable work:\n- Columns, beams, slabs, footings\n- Residential and commercial structures\n\nBenefits:\n- High yield strength\n- Good ductility and weldability\n\nNot recommended:\n- Do not select a grade without structural drawings.\n\nNote: Bar diameter and spacing are decided by the structural engineer.",
    keywords: ["tata tmt", "tata", "tmt", "steel", "सरिया", "tata steel", "tata tmt bars"],
    materialType: "steel",
    companyName: "Tata",
  },
  {
    category: "steel",
    title: "Mongia Steel",
    content:
      "Mongia Steel is a commonly available steel rod brand.\n\nSuitable work:\n- RCC reinforcement\n- Residential construction\n\nBenefits:\n- Good availability\n- Used for structural reinforcement\n\nNot recommended:\n- Verify the grade and quality with the supplier.\n\nNote: Confirm the Fe grade and diameter per the structural design.",
    keywords: ["mongia", "mongia steel", "steel", "सरिया", "mongia steel rod"],
    materialType: "steel",
    companyName: "Mongia",
  },
  {
    category: "steel",
    title: "Fe500 TMT Grade",
    content:
      "Fe500 is a common TMT grade in India.\n\nSuitable work:\n- RCC columns, beams, slabs\n- General reinforcement\n\nBenefits:\n- Good yield strength (500 N/mm² nominal)\n- Widely used and available\n\nNot recommended:\n- Do not choose a grade without structural design.\n\nNote: Fe500 is a general grade; the structural design decides the final grade and diameter.",
    keywords: ["fe500", "fe 500", "tmt grade", "steel grade", "steel", "सरिया", "konsa sariya", "सरिया कौन सा लेना चाहिए"],
    materialType: "steel",
  },
  {
    category: "steel",
    title: "Fe550D TMT Grade",
    content:
      "Fe550D is a higher-strength TMT grade with good ductility.\n\nSuitable work:\n- RCC members where higher strength is designed\n- High-rise structures\n\nBenefits:\n- Higher yield strength\n- Good ductility\n\nNot recommended:\n- Only use if the structural design specifies Fe550D.\n\nNote: Follow the structural drawings for grade and diameter.",
    keywords: ["fe550d", "fe550", "fe 550d", "tmt grade", "steel grade", "steel", "सरिया"],
    materialType: "steel",
  },
  {
    category: "steel",
    title: "Steel Grade Selection",
    content:
      "How to choose TMT steel:\n\n- Fe415/Fe500/Fe550D indicate nominal yield strength.\n- Higher grade generally means higher strength per area.\n\nBenefits:\n- Using the correct grade improves structural safety.\n\nNot recommended:\n- Never pick a grade without structural drawings.\n\nNote: Grade and diameter are specified by the structural engineer.",
    keywords: ["which steel", "konsa steel", "steel selection", "steel choose", "steel grade", "konsa sariya", "सरिया कौन सा लेना चाहिए"],
    materialType: "steel",
  },

  // ======================================================================
  // BRICKS
  // ======================================================================
  {
    category: "bricks",
    title: "Red Brick",
    content:
      "Red clay brick is the traditional brick used in masonry.\n\nSuitable work:\n- Load-bearing walls\n- Partition walls\n- Masonry\n\nBenefits:\n- Widely available and economical\n- Good compressive strength\n- Familiar to local masons\n\nNot recommended:\n- For very lightweight structures, blocks may be more efficient.\n\nNote: Soak bricks before use; check quality (shape, cracks, sound).",
    keywords: ["red brick", "red clay brick", "brick", "ईंट", "eent", "red brick vs fly ash"],
    materialType: "bricks",
  },
  {
    category: "bricks",
    title: "Fly Ash Brick",
    content:
      "Fly ash brick is made from fly ash, sand and cement.\n\nSuitable work:\n- Walls\n- Masonry\n- Pavements\n\nBenefits:\n- Uniform size and smooth finish\n- Lower water absorption than some red bricks\n- Environment-friendly use of industrial by-product\n\nNot recommended:\n- Confirm strength and quality with the manufacturer.\n\nNote: Good for non-load-bearing and partition walls.",
    keywords: ["fly ash brick", "flyash", "fly ash", "brick", "ईंट", "fly ash brick benefits"],
    materialType: "bricks",
  },
  {
    category: "bricks",
    title: "AAC Block",
    content:
      "AAC (Autoclaved Aerated Concrete) block is a lightweight building block.\n\nSuitable work:\n- Partition walls\n- External walls\n\nBenefits:\n- Lightweight, reducing structural load\n- Good thermal and sound insulation\n- Larger units speed construction\n\nNot recommended:\n- Needs special block adhesive/mortar.\n- Confirm structural suitability for load-bearing use with an engineer.\n\nNote: Not typically used for heavy load-bearing walls without design.",
    keywords: ["aac", "aac block", "foam block", "lightweight block", "block", "aac brick"],
    materialType: "bricks",
  },
  {
    category: "bricks",
    title: "Concrete Block",
    content:
      "Concrete block (including hollow block) is a strong masonry unit.\n\nSuitable work:\n- Walls\n- Boundary walls\n- Load-bearing structures\n\nBenefits:\n- Durable and strong\n- Available in different sizes\n\nNot recommended:\n- Check local availability and curing requirements.\n\nNote: Confirm sizes and quality with the supplier.",
    keywords: ["concrete block", "hollow block", "cement block", "block", "concrete brick"],
    materialType: "bricks",
  },
  {
    category: "bricks",
    title: "Red Brick vs Fly Ash Brick Comparison",
    content:
      "Comparison: Red Brick vs Fly Ash Brick\n\nRed Brick:\n- Traditional, widely available\n- Good compressive strength\n- Higher water absorption, less uniform size\n\nFly Ash Brick:\n- Uniform size, smooth finish\n- Lower water absorption\n- Environment-friendly\n\nWhich is better?\n- Red brick for traditional load-bearing masonry.\n- Fly ash brick for uniform, smooth walls and pavements.\n\nNote: Final choice depends on wall type, budget and local availability.",
    keywords: ["red brick vs fly ash", "red brick vs fly ash brick", "comparison brick", "which brick better"],
    materialType: "bricks",
  },
  {
    category: "bricks",
    title: "Red Brick vs AAC Block Comparison",
    content:
      "Comparison: Red Brick vs AAC Block\n\nRed Brick:\n- Higher density and strength\n- Traditional mortar masonry\n- More load on the structure\n\nAAC Block:\n- Lightweight — less structural load\n- Better thermal and sound insulation\n- Needs special block adhesive\n\nWhich is better?\n- Red brick for load-bearing walls.\n- AAC block for lightweight partition and external walls.\n\nNote: Confirm structural suitability with your engineer.",
    keywords: ["red brick vs aac", "red brick vs aac block", "brick vs aac", "which brick better"],
    materialType: "bricks",
  },

  // ======================================================================
  // SAND
  // ======================================================================
  {
    category: "sand",
    title: "River Sand",
    content:
      "River sand is natural sand used in construction.\n\nSuitable work:\n- Mortar\n- Plaster\n- Concrete\n\nBenefits:\n- Naturally graded\n- Good workability in mortar/plaster\n- Traditional choice\n\nNot recommended:\n- Avoid sand with high silt/clay content.\n\nNote: Wash if needed; quality affects mortar and concrete strength.",
    keywords: ["river sand", "sand", "रेत", "balu", "बालू", "river sand vs m sand"],
    materialType: "sand",
  },
  {
    category: "sand",
    title: "M Sand (Manufactured Sand)",
    content:
      "M Sand is crushed stone sand produced in a controlled process.\n\nSuitable work:\n- Concrete\n- Masonry\n- Plastering\n\nBenefits:\n- Easily available\n- Consistent grading through controlled manufacturing\n- Used in concrete and masonry\n\nNot recommended:\n- Check grading and dust content before use.\n\nNote: Quality and grading are very important.",
    keywords: ["m sand", "msand", "m-sand", "machine sand", "crusher sand", "sand", "एम सैंड", "m sand benefits"],
    materialType: "sand",
  },
  {
    category: "sand",
    title: "M Sand vs River Sand Comparison",
    content:
      "Comparison: M Sand vs River Sand\n\nM Sand:\n- Easily available and consistent\n- Controlled grading\n- Good for concrete and masonry\n\nRiver Sand:\n- Naturally graded, traditional\n- Good workability in mortar/plaster\n- Availability varies by region\n\nWhich is better?\n- M sand for consistent, controlled concrete work.\n- River sand for traditional plaster and mortar.\n\nNote: Quality and grading matter more than the type.",
    keywords: ["m sand vs river sand", "m sand vs river sand comparison", "which sand better", "sand comparison"],
    materialType: "sand",
  },

  // ======================================================================
  // AGGREGATE
  // ======================================================================
  {
    category: "aggregate",
    title: "10mm Aggregate",
    content:
      "10mm aggregate is a fine coarse aggregate.\n\nSuitable work:\n- Thin concrete sections\n- Flooring base\n- Grit / finishing\n\nBenefits:\n- Finer size for thin sections\n- Good for flooring\n\nNot recommended:\n- Often mixed with 20mm in structural concrete.\n\nNote: Use clean, graded aggregate.",
    keywords: ["10mm", "10 mm", "10mm aggregate", "10mm gitti", "aggregate", "गिट्टी"],
    materialType: "aggregate",
  },
  {
    category: "aggregate",
    title: "20mm Aggregate",
    content:
      "20mm aggregate is the standard coarse aggregate for RCC.\n\nSuitable work:\n- RCC columns, beams and slabs\n- Structural concrete\n\nBenefits:\n- Balanced size for structural members\n- Widely used\n\nNot recommended:\n- Use per the concrete mix design.\n\nNote: Clean, graded aggregate improves concrete strength.",
    keywords: ["20mm", "20 mm", "20mm aggregate", "20mm gitti", "aggregate", "गिट्टी", "20mm stone"],
    materialType: "aggregate",
  },
  {
    category: "aggregate",
    title: "40mm Aggregate",
    content:
      "40mm aggregate is a large-size coarse aggregate.\n\nSuitable work:\n- PCC (plain cement concrete)\n- Foundation base and mass concrete\n\nBenefits:\n- Provides bulk in lean concrete\n- Good for PCC and base layers\n\nNot recommended:\n- Not used alone in thin RCC members.\n\nNote: Usually used in lean mixes and base layers.",
    keywords: ["40mm", "40 mm", "40mm aggregate", "40mm gitti", "aggregate", "गिट्टी", "40mm stone"],
    materialType: "aggregate",
  },
  {
    category: "aggregate",
    title: "Aggregate Selection",
    content:
      "How to choose aggregate size:\n\n- 10mm: thin sections, flooring, grit.\n- 20mm: standard RCC structural concrete.\n- 40mm: PCC, foundation base, mass concrete.\n\nBenefits:\n- Correct size improves concrete strength and finish.\n- Clean, graded aggregate reduces voids.\n\nNot recommended:\n- Do not use oversized aggregate in thin RCC sections.\n\nNote: Follow the concrete mix design.",
    keywords: ["aggregate size", "konsa aggregate", "aggregate selection", "gitti size", "गिट्टी कौन सी"],
    materialType: "aggregate",
  },

  // ======================================================================
  // ROOFING
  // ======================================================================
  {
    category: "roofing",
    title: "RCC Roof",
    content:
      "RCC roof is a reinforced concrete slab.\n\nSuitable work:\n- Permanent residential roofs\n- Multi-storey buildings\n\nBenefits:\n- Strong permanent structure\n- Flat usable terrace\n\nNot recommended:\n- Requires structural design (slab thickness and reinforcement).\n\nNote: Higher construction complexity and cost than sheet roofing.",
    keywords: ["rcc roof", "rcc slab", "slab roof", "roof", "छत", "rcc roof vs sheet"],
    materialType: "roofing",
  },
  {
    category: "roofing",
    title: "Roofing Sheet",
    content:
      "Roofing sheet is a lightweight roofing material (steel/profile).\n\nSuitable work:\n- Sheds\n- Carports\n- Certain structures\n- Sloped roofs\n\nBenefits:\n- Lightweight\n- Fast installation\n\nNot recommended:\n- For permanent multi-storey residential flats.\n\nNote: Add overlap and ridge allowance; consider insulation and weather protection.",
    keywords: ["roofing sheet", "roof sheet", "sheet roof", "रूफिंग शीट", "छत की चादर"],
    materialType: "roofing",
  },
  {
    category: "roofing",
    title: "Waterproofing",
    content:
      "Roof and terrace waterproofing prevents leakage and seepage.\n\nSuitable work:\n- RCC roofs\n- Terraces\n- Bathrooms\n- Foundations\n\nBenefits:\n- Prevents water seepage\n- Protects the structure from moisture\n- Extends roof life\n\nNot recommended:\n- Do not apply on a damp or unclean surface.\n\nNote: Coverage depends on the manufacturer's product and number of coats.",
    keywords: ["waterproofing", "roof waterproofing", "water proofing", "लेप", "waterproof", "छत में पानी"],
    materialType: "roofing",
  },
  {
    category: "roofing",
    title: "RCC Roof vs Roofing Sheet Comparison",
    content:
      "Comparison: RCC Roof vs Roofing Sheet\n\nRCC Roof:\n- Strong permanent structure\n- Heavier\n- Structural design required\n- Higher construction complexity\n\nRoofing Sheet:\n- Lightweight\n- Faster installation\n- Suitable for certain structures\n- Insulation/weather considerations required\n\nWhich is better?\n- RCC roof for permanent residential houses.\n- Roofing sheet for sheds, carports and temporary structures.",
    keywords: ["rcc roof vs sheet", "rcc roof vs roofing sheet", "which roof better", "rcc roof better hai ya sheet", "छत कौन सी बेहतर"],
    materialType: "roofing",
  },

  // ======================================================================
  // FINISHING
  // ======================================================================
  {
    category: "finishing",
    title: "Paint",
    content:
      "Paint is used to protect walls and add colour.\n\nSuitable work:\n- Interior walls and ceilings (interior paint)\n- Exterior walls (exterior paint)\n\nBenefits:\n- Protects walls from weather\n- Adds colour and finish\n\nNot recommended:\n- Apply putty and primer before paint for best results.\n\nNote: Coverage varies by brand, surface and number of coats.",
    keywords: ["paint", "पेंट", "interior paint", "exterior paint", "painting", "पुताई"],
    materialType: "finishing",
  },
  {
    category: "finishing",
    title: "Putty",
    content:
      "Wall putty smooths the wall surface before painting.\n\nSuitable work:\n- Interior walls before primer/paint\n\nBenefits:\n- Smooth finish\n- Better paint coverage\n- Hides minor imperfections\n\nNot recommended:\n- Not a substitute for plaster over rough surfaces.\n\nNote: Coverage varies by brand and number of coats.",
    keywords: ["putty", "wall putty", "पुट्टी", "wall putty kya"],
    materialType: "finishing",
  },
  {
    category: "finishing",
    title: "Primer",
    content:
      "Primer is a base coat applied on walls before paint.\n\nSuitable work:\n- Walls and ceilings before painting\n\nBenefits:\n- Seals the surface\n- Improves paint adhesion\n- Reduces paint consumption\n\nNot recommended:\n- Choose the primer type based on the paint system.\n\nNote: Apply on a clean, dry surface.",
    keywords: ["primer", "प्राइमर", "primer kya", "wall primer"],
    materialType: "finishing",
  },
  {
    category: "finishing",
    title: "Tiles",
    content:
      "Tiles are used for flooring and wall covering.\n\nSuitable work:\n- Flooring\n- Bathroom and kitchen\n- Wall tiles\n\nBenefits:\n- Durable and easy to clean\n- Wide range of sizes and finishes\n\nNot recommended:\n- Add 5-10% wastage for cutting/breakage.\n\nNote: Use tile adhesive/cement mortar and grout per the surface.",
    keywords: ["tiles", "टाइल", "floor tiles", "wall tiles", "flooring", "tile selection"],
    materialType: "finishing",
  },
  {
    category: "finishing",
    title: "Finishing Selection",
    content:
      "How to choose finishing materials:\n\n- Plaster first for a smooth base.\n- Putty for smooth walls before paint.\n- Primer seals the surface.\n- Paint for colour and protection.\n- Tiles for flooring, kitchen and bathroom.\n\nBenefits:\n- Correct finishing improves durability and appearance.\n\nNot recommended:\n- Skip putty/primer only if the paint system allows it.\n\nNote: Coverage and quantity vary by brand and surface.",
    keywords: ["finishing", "finishing material", "konsa paint", "paint selection", "putty primer paint"],
    materialType: "finishing",
  },

  // ======================================================================
  // BRICKS (extra) — boundary / masonry support
  // ======================================================================
  {
    category: "bricks",
    title: "Brick Masonry Guide",
    content:
      "General brick masonry guidance:\n\nSuitable work:\n- Load-bearing and partition walls\n- Boundary walls\n\nBenefits:\n- Strong, durable walls\n\nNot recommended:\n- Soak bricks before use to avoid absorbing mortar water.\n\nNote: Use proper mortar mix and plumb/level the walls.",
    keywords: ["brick masonry", "masonry", "brick wall", "brickwork", "ईंट की दीवार", "ईंट कितनी"],
    materialType: "bricks",
  },

  // ======================================================================
  // CEMENT (extra) — usage comparisons
  // ======================================================================
  {
    category: "cement",
    title: "Cement Usage Guide",
    content:
      "How cement is used by application:\n\n- RCC slab/columns/beams: OPC 53 or suitable grade.\n- Plaster and masonry: PPC or OPC 43.\n- Flooring and PCC: OPC 43 / PPC.\n\nBenefits:\n- Using the right cement improves strength and durability.\n\nNot recommended:\n- Do not use a single grade for every job without checking the design.\n\nNote: Confirm the mix design with your engineer.",
    keywords: ["cement usage", "cement for slab", "cement for plaster", "cement for foundation", "cement kahan use"],
    materialType: "cement",
  },
  {
    category: "cement",
    title: "Cement Quantity Guide",
    content:
      "Approximate cement quantity guidance:\n\n- Rough rule: ~0.4 bags per sq.ft of built-up area (preliminary).\n- Exact quantity depends on structural design, mix and site.\n\nBenefits:\n- Helps plan cement requirement.\n\nNot recommended:\n- Do not rely on a rough rule for structural design.\n\nNote: This is a preliminary planning figure, not engineering approval.",
    keywords: ["cement kitna", "cement quantity", "how much cement", "सीमेंट कितना", "cement requirement"],
    materialType: "cement",
  },

  // ======================================================================
  // STEEL (extra) — quantity
  // ======================================================================
  {
    category: "steel",
    title: "Steel Quantity Guide",
    content:
      "Approximate steel quantity guidance:\n\n- Rough rule: ~4 kg per sq.ft of built-up area (preliminary).\n- Exact quantity depends on structural design and element.\n\nBenefits:\n- Helps plan steel requirement.\n\nNot recommended:\n- Do not rely on a rough rule for structural design.\n\nNote: This is a preliminary planning figure, not engineering approval.",
    keywords: ["steel kitna", "steel quantity", "how much steel", "सरिया कितना", "steel requirement", "sariya kitna"],
    materialType: "steel",
  },
  {
    category: "steel",
    title: "Steel vs Cement Use",
    content:
      "Comparison: Steel vs Cement in RCC\n\nCement:\n- Binds aggregates into concrete\n- Works well in compression\n\nSteel:\n- Handles tensile forces\n- Provides ductility\n\nWhich is better?\n- They work together in RCC — cement for compression, steel for tension.\n\nNote: Both are required in reinforced concrete.",
    keywords: ["steel vs cement", "cement vs steel", "why steel in concrete", "steel cement comparison"],
    materialType: "steel",
  },

  // ======================================================================
  // SAND (extra) — plaster
  // ======================================================================
  {
    category: "sand",
    title: "Sand for Plaster",
    content:
      "Which sand for plaster:\n\n- Use fine, well-graded sand for a smooth plaster finish.\n- Avoid silt-heavy sand.\n\nBenefits:\n- Smooth finish\n- Better plaster quality\n\nNot recommended:\n- Coarse or dirty sand causes cracks and poor finish.\n\nNote: Use clean, silt-free sand.",
    keywords: ["plaster sand", "sand for plaster", "plastering sand", "रेत कौन सी", "plaster ret"],
    materialType: "sand",
  },

  // ======================================================================
  // AGGREGATE (extra) — concrete
  // ======================================================================
  {
    category: "aggregate",
    title: "Aggregate for Concrete",
    content:
      "Which aggregate for concrete:\n\n- 20mm: standard for RCC structural concrete.\n- 10mm: thin sections and finishing.\n- 40mm: PCC and base layers.\n\nBenefits:\n- Correct size improves strength.\n- Clean, graded aggregate reduces voids.\n\nNot recommended:\n- Oversized aggregate in thin RCC sections.\n\nNote: Follow the concrete mix design.",
    keywords: ["aggregate for concrete", "concrete aggregate", "gitti concrete", "गिट्टी कितनी"],
    materialType: "aggregate",
  },

  // ======================================================================
  // FINISHING (extra) — flooring
  // ======================================================================
  {
    category: "finishing",
    title: "Flooring Guide",
    content:
      "General flooring options:\n\n- Tiles: durable, easy to clean, many sizes.\n- Granite: stone, good for kitchen platforms and stairs.\n- Marble: premium, needs sealing.\n\nBenefits:\n- Completes the living surface\n- Adds durability and aesthetics\n\nNot recommended:\n- Add 5-10% wastage for cutting/breakage.\n\nNote: Material choice depends on budget and use.",
    keywords: ["flooring", "फर्श", "floor tiles", "granite", "marble", "konsa flooring"],
    materialType: "finishing",
  },

  // ======================================================================
  // ROOFING (extra) — insulation & drainage
  // ======================================================================
  {
    category: "roofing",
    title: "Roof Insulation",
    content:
      "Roof insulation helps reduce heat transfer from the roof.\n\nSuitable work:\n- RCC roofs and terraces, especially top floors\n\nBenefits:\n- Reduces heat\n- Lowers cooling load\n- Improves comfort\n\nNot recommended:\n- Combine with waterproofing for best results.\n\nNote: Use appropriate insulation material for your climate.",
    keywords: ["insulation", "roof insulation", "heat proof", "इंसुलेशन", "thermocol"],
    materialType: "roofing",
  },
  {
    category: "roofing",
    title: "Roof Drainage",
    content:
      "Roof drainage prevents water logging on the roof.\n\nSuitable work:\n- RCC roofs and terraces\n\nBenefits:\n- Prevents water logging\n- Protects waterproofing and slab\n- Directs rain water away\n\nNot recommended:\n- Poor slope and undersized outlets cause water pooling.\n\nNote: Proper slope and outlet size are important.",
    keywords: ["drainage", "roof drainage", "water logging", "नाली", "roof slope"],
    materialType: "roofing",
  },
];

async function main() {
  console.log("🌱 Seeding construction knowledge...");

  const existing = await prisma.constructionKnowledge.count();
  if (existing > 0) {
    console.log(`  – ${existing} knowledge records already exist, skipping.`);
    console.log("  – To re-seed, delete the ConstructionKnowledge rows first.");
    return;
  }

  let created = 0;
  for (const record of RECORDS) {
    await prisma.constructionKnowledge.create({
      data: {
        category: record.category,
        title: record.title,
        content: record.content,
        keywords: record.keywords,
        materialType: record.materialType ?? null,
        companyName: record.companyName ?? null,
      },
    });
    created++;
  }

const byCategory = RECORDS.reduce<Record<string, number>>((acc, r) => {
    acc[r.category] = (acc[r.category] ?? 0) + 1;
    return acc;
  }, {});

  console.log(`  ✔ Created ${created} knowledge records.`);
  console.log("    Breakdown by category:");
  for (const [cat, n] of Object.entries(byCategory)) {
    console.log(`      - ${cat}: ${n}`);
  }
  console.log("✅ Construction knowledge seed complete.");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
