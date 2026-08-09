# Construction Assistant Upgrade — Implementation TODO

## Step 1: dataset.ts
- [x] Keep existing exports (MATERIAL_RATES, BuildQuality, COST_BANDS, FLOOR_HEIGHT_FACTOR, MAX_FLOORS, MAX_AREA)
- [x] Add "luxury" to BuildQuality + COST_BANDS
- [x] Add STRUCTURAL_DISCLAIMER constants
- [x] Add MATERIALS dataset (~40 materials)
- [x] Add CONSTRUCTION_STAGES (30 stages)
- [x] Add LOCATIONS cost dataset (configurable)
- [x] Add foundation types, roof formula, waterproofing, electrical, plumbing knowledge blocks

## Step 2: hindi_keywords.ts
- [x] Expand keyword maps (hundreds of Hindi+English keywords)
- [x] Keep all existing exports intact

## Step 3: calculator.ts
- [x] Keep parseDimensions, formatIndianNumber, calculateMaterials unchanged
- [x] Add roof/slab, brick wall, PCC, plaster, flooring, wall tiles, paint, cost-by-location, water tank, doors/windows, electrical, plumbing calculators

## Step 4: assistant.ts
- [x] Extend SessionData (pendingIntent, location)
- [x] Preserve size→floors→quality→estimate flow
- [x] Add knowledge-query layer for stages/materials/cost
- [x] Multi-turn pendingIntent handling
- [x] Safety disclaimers for structural questions
- [x] Emoji response format + disclaimer message
- [x] Cement company/product knowledge (CEMENT_COMPANIES, recommend, offer)

## Step 5: Conversational upgrade (Phases 1–10)
- [x] Modular dataset architecture (materials, cement_data, steel_data, roofing_data, waterproofing_data, construction_stages, company_products, conversation_memory, conversation_data)
- [x] Natural conversational engine (greeting, small talk, smart question flow)
- [x] Conversation memory (length, width, area, floors, totalArea=area×floors, quality, location, rooms, bathrooms, roof/foundation, cement product)
- [x] Answer-only-what-is-asked behavior (cement/steel/cost use totalArea)
- [x] Bilingual (Hindi/English/Hinglish) auto-detection
- [x] Friendly welcome + suggested questions chips
- [x] Voice (Web Speech API) integrated with same engine logic
- [x] Chat-only scrolling (homepage does not jump)
- [x] Enriched API response (conversation, suggestions, producedEstimate)
- [x] DB query saving preserved (message, language, response)

## Step 5b: tests
- [x] Add conversational assistant test cases to api.test.ts (13 construction-assistant tests passing)
- [x] Standalone verify_assistant.ts (20 checks passing)

## Step 6: build & verify
- [x] cd server && npm run build (passes)
- [x] cd client && npm run build (passes)
- [x] Test POST /api/construction-assistant/chat with required inputs
