# Construction Assistant Feature — Implementation TODO

## Backend — construction_ai module
- [x] Create `server/src/construction_ai/dataset.ts`
- [x] Create `server/src/construction_ai/hindi_keywords.ts`
- [x] Create `server/src/construction_ai/calculator.ts`
- [x] Create `server/src/construction_ai/assistant.ts`

## Backend — route & wiring
- [x] Create `server/src/routes/constructionAssistant.ts`
- [x] Mount route in `server/src/app.ts`
- [x] Add `ConstructionQuery` model to `server/prisma/schema.prisma`
- [x] Add migration SQL for `ConstructionQuery`
- [x] Add `constructionChatSchema` to `server/src/validators/index.ts`

## Frontend
- [x] Add `constructionAssistantChat()` to `client/src/lib/api.ts`
- [x] Add `ConstructionChatResponse` to `client/src/types.ts`
- [x] Create `client/src/components/ConstructionAssistant.tsx`
- [x] Insert section in `client/src/pages/Home.tsx`

## Fixes (round 2)
- [x] Fix voice input (Web Speech API, continuous=false, language hi-IN/en-IN, input editing, error handling)
- [x] Fix chat auto-scroll (scroll only container, max-h 500px, smooth scroll to latest)
- [x] Add `.vscode/settings.json` to silence Tailwind "Unknown at rule" warnings

## Verification
- [x] `cd server && npm run build`
- [x] `cd client && npm run build`
