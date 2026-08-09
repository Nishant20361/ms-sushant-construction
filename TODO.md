# Construction Assistant PART 2 — Implementation TODO (Phases 11–30)

## Phase 13 — Expanded Material Knowledge (new dataset)
- [x] Create `material_knowledge.ts` (cement OPC/PPC/PSC, steel TMT/Fe grades, bricks, sand, aggregate, roof, waterproofing, finishing)

## Phase 14 — Why Questions (new dataset)
- [x] Create `why_questions.ts` (why steel in roof, why waterproofing, why wet/cure cement)

## Phase 16 — Comparison Engine (new dataset)
- [x] Create `comparisons.ts` (OPC vs PPC, M-Sand vs River Sand, Red Brick vs AAC, RCC Roof vs Sheet, ACC vs Nuvoco, etc.)

## Phase 20 — Material Checklist (new dataset)
- [x] Create `material_checklist.ts` (FOUNDATION/STRUCTURE/BRICKWORK/PLASTER/ROOF/FINISHING/ELECTRICAL/PLUMBING)

## Phase 18 — Cost Breakdown (new dataset + calculator)
- [x] Create `cost_breakdown.ts` (Material/Labour/Finishing/Electrical/Plumbing/Contingency split)

## Phase 27 — Product Data System (new dataset)
- [x] Create `product_data.ts` (structured product DB with confidence tagging KNOWN/GENERAL/UNAVAILABLE)

## Phase 25 — Smart Corrections & Phase 22 — Aliases (calculator)
- [x] Extend `parseDimensions` to handle "40x35h", "40 feet by 35 feet", "बाय", "बाइ", "*"
- [x] Add `costBreakdown(area, quality)` calculator
- [x] Add room-based area estimate helper

## Phase 22 — Aliases & intent markers (hindi_keywords / part2_keywords)
- [x] Add consult intent markers (build/renovate/roof/foundation/boundary wall/room/kitchen/bathroom/staircase/RCC slab/repair/plaster/flooring/painting/brickwork/concrete/electrical/plumbing/material-select/cement-select/steel-select/cost/quantity)
- [x] Add WHY markers, comparison markers, benefit/loss markers, checklist markers, stage-guide markers, incomplete-question words
- [x] Add material aliases (cement/simaat, steel/sariya/saria, brick/eent, sand/रेत/baloo, aggregate/gitti, roof/छत/slab, foundation/नींव/नीव)

## Phase 12 — Conversation memory (conversation_memory)
- [x] Extend SessionData: intent, consultIntent, consultStep, estimatedArea, bedrooms, halls, stores, balconies, verandas, staircases, roomsListed, lastProduct, roofType, boundaryWall, askedLocationForCost

## Main engine (part2_handlers.ts + assistant.ts wiring)
- [x] Phase 11 — Consultation mode (roof RCC/sheet, foundation, boundary wall, room, etc.)
- [x] Phase 12 — Room-based estimation flow
- [x] Phase 13 — Wire material knowledge lookups
- [x] Phase 14 — Why-question answers
- [x] Phase 15 — Benefit/loss answers using dataset
- [x] Phase 16 — Comparison engine responses
- [x] Phase 17 — Location awareness for cost
- [x] Phase 18 — Cost breakdown response
- [x] Phase 19 — Construction stage guide (ghar kaise banta hai)
- [x] Phase 20 — Material checklist response
- [x] Phase 21 — Follow-up suggestions after answers
- [x] Phase 22 — Material aliases mapping
- [x] Phase 23 — Incomplete question handling
- [x] Phase 24 — Follow-up memory usage (never forget context, update floors)
- [x] Phase 25 — Smart corrections (typos, dimension variants)
- [x] Phase 26 — Safety/engineering disclaimer for structural questions
- [x] Phase 27 — Product lookup integration
- [x] Phase 28 — Data confidence tagging
- [x] Phase 29 — Response quality (friendly, short/complex, mobile-friendly, not repetitive)

## Phase 30 — Final Testing
- [x] Extend `verify_assistant.ts` (Part 1: 20 checks passing)
- [x] Create `verify_assistant_part2.ts` (Test conversations 1–20: 20 passing)
- [x] Extend `server/tests/api.test.ts` with new assistant cases (20 passing)
- [x] Client: add new suggested-question chips for Part 2 abilities

## Build & Verify
- [x] `cd server && npm run build` (passes)
- [x] `cd client && npm run build` (passes)
- [x] `npx tsx verify_assistant.ts` (20/20)
- [x] `npx tsx verify_assistant_part2.ts` (20/20)
- [x] Run server API tests for assistant endpoints (20/20)

