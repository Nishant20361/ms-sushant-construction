# Construction Assistant — Part 2 (Phases 11–30) Implementation TODO

## PART 2 — Advanced Trained Construction Assistant (local / rule-based)

### Phase 11 — Construction Consultation Mode
- [x] Intent detection (build/renovate/roof/foundation/boundary wall/room/kitchen/bathroom/staircase/RCC slab/repair roof/waterproofing/plastering/flooring/painting/brickwork/concrete/electrical/plumbing/material-select/cement-select/steel-select/cost/quantity)
- [x] Roof type detail (RCC vs sheet) follow-up
- [x] part2_keywords.ts INTENT_* markers

### Phase 12 — Room-Based Estimation
- [x] Extract bedrooms/hall/kitchens/bathrooms/store/balcony/veranda/staircase
- [x] estimateAreaFromRooms() + RoomComposition (calculator.ts)
- [x] Natural ask for house size when missing

### Phase 13 — Material Knowledge
- [x] material_knowledge.ts (cement OPC/PPC/PSC, steel TMT/grades, bricks red/flyash/AAC/concrete, sand river/M/plastering/concrete, aggregate coarse/20mm/10mm, roof RCC/sheet/waterproofing/insulation/drainage, waterproofing roof/bathroom/terrace/foundation/crack, finishing plaster/putty/primer/paint/tiles/flooring)

### Phase 14 — "Why" Questions
- [x] why_questions.ts (steel in roof, waterproofing, wet/curing cement, brick soak, mix ratio, steel in columns)

### Phase 15 — Benefit / Loss / Comparison
- [x] Benefit/loss markers (BENEFIT_MARKERS, LOSS_MARKERS)
- [x] Material knowledge benefit/loss replies

### Phase 16 — Comparison Engine
- [x] comparisons.ts (OPC vs PPC, PSC vs OPC, M-Sand vs River, Red Brick vs Fly Ash, Red Brick vs AAC, RCC vs Sheet, ACC vs Nuvoco, Cement vs Steel)
- [x] Bilingual bullet follow-up questions

### Phase 17 — Location Awareness
- [x] Ask location when cost matters (existing LOCATIONS dataset + cost-by-location)
- [x] configurable estimate label (NOT live market price)

### Phase 18 — Cost Breakdown
- [x] cost_breakdown.ts (Material/Labour/Finishing/Electrical/Plumbing/Other %) 
- [x] costBreakdownReply() in part2_handlers.ts

### Phase 19 — Construction Stage Guide
- [x] STAGE_GUIDE_MARKERS → constructionSequenceReply (16 steps)

### Phase 20 — Material Checklist
- [x] material_checklist.ts (FOUNDATION/STRUCTURE/BRICKWORK/PLASTER/ROOF/FINISHING/ELECTRICAL/PLUMBING)
- [x] buildChecklistReply()

### Phase 21 — Follow-Up Suggestions
- [x] followupSuggestions() (cement/steel/bricks/cost breakdown/checklist)

### Phase 22 — Understand Different Ways of Asking
- [x] MATERIAL_ALIASES (simaat/सीमेंट, sariya/सरिया, eent/ईंट, बालू, gitti/गिट्टी, छत/स्लैब, नींव/नीव/footing)
- [x] matchMaterialAlias()

### Phase 23 — Handle Incomplete Questions
- [x] INCOMPLETE_WORDS + isIncomplete() natural clarification

### Phase 24 — Handle Follow-Up Questions
- [x] Conversation memory (dimensions, floors, quality, totalArea persist across turns)
- [x] Smart floor-update (2 floor → 3 floor)

### Phase 25 — Smart Corrections
- [x] parseDimensions handles "40x35h", "40 by 35 feet", "40*35", "40 × 35", "40 बाय 35", "बाइ"
- [x] cement aliases "cemnt"/"cment"/"seement"
- [x] steel aliases "sariya"/"saria"/"सरिया"

### Phase 26 — Safety / Engineering Disclaimer
- [x] Structural disclaimers preserved (no invented dimensions/design)

### Phase 27 — Product Data System
- [x] product_data.ts (ACC F2R, ACC Concreto, Nuvoco Vistas, UltraTech, OPC/PPC/PSC, M-Sand, River Sand, Red/Fly Ash Brick, AAC, Concrete Block, TMT, Roofing Sheet, RCC Slab)
- [x] findProduct() structured lookup with source tag

### Phase 28 — Data Confidence
- [x] DataConfidence type (KNOWN / GENERAL / UNAVAILABLE)
- [x] All products tagged with confidence + "local dataset" source

### Phase 29 — Response Quality
- [x] Friendly, short/simple, bilingual, emoji-sparing, non-repetitive

### Phase 30 — Final Testing
- [x] verify_assistant_part2.ts — 20 test cases covering Test conversations 1–20
- [x] verify_assistant.ts — Part 1 20 checks still pass
- [x] Server typecheck clean
- [x] Server build passes
- [x] Client build passes
- [x] Existing API tests (43) pass

## ALSO COMPLETED — Construction Knowledge Database (RAG)
- [x] ConstructionKnowledge Prisma model + migration (20260809114043_add_construction_knowledge)
- [x] knowledge.service.ts (addKnowledge/searchKnowledge/getKnowledgeByCategory/getKnowledgeByKeyword)
- [x] seedConstructionKnowledge.ts (26338+ chars, all categories)
- [x] constructionKnowledgeSchema validator
- [x] routes/constructionKnowledge.ts (GET search, GET category/keyword, POST admin add)
- [x] Mounted in app.ts at /api and /api/public
- [x] db:seed:knowledge script in package.json

## Final Build & Verify (all green)
- [x] cd server && npm run build (passes)
- [x] cd client && npm run build (passes)
- [x] npx tsx verify_assistant.ts (20 passed)
- [x] npx tsx verify_assistant_part2.ts (20 passed)
- [x] npx vitest run tests/api.test.ts (43 passed)
