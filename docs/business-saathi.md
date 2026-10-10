# Business Saathi — admin assistant

Business Saathi is separate from the public construction assistant. Open it from the web admin sidebar or the Sushant Control app's **More → Business Saathi** row. It does not add a bottom navigation tab or a prominent dashboard card.

## Final scope

- Look up a customer's current outstanding balance from actual non-cancelled orders, bill discounts and recorded payments, using the same financial calculation as the existing admin tools.
- Search by name or mobile. Multiple matches require explicit selection; options include the name, mobile ending and address where available. Customers are identified by mobile, matching the existing ledger.
- Talk in Hindi, Hinglish or English like a friendly business companion with an accountant's mindset. Discuss any type of business, growth, pricing concepts, expenses, cash flow and planning. This is general advice, not analysis of private sales or profit records.
- Voice dictation creates editable text. The admin reviews it and taps Send.
- No stock/product/price changes, payment recording, order actions, business reports or PDF generation. There is no assistant mutation/confirmation endpoint or database migration.

## Privacy and access

Admin authentication, existing CSRF validation and the assistant rate limiter protect the endpoint. Actual dues and customer choices additionally require the existing server-verified Khatabook PIN unlock, including when selecting a previously offered option. General conversation does not require that PIN. Enter the PIN only in the separate unlock form.

Selection tokens expire after 10 minutes and are bound to the admin and signed-in device session. Conversation context contains at most four short chat messages, expires after 30 minutes and has the same session binding. Chat is held in screen memory and is cleared by New conversation or the screen unmounting; it is not saved as a transcript in the database or local storage. Signed tokens are not encrypted. Customer records and computed dues are never included in the Groq prompt; only the admin's submitted text and recent general conversation are sent to the provider. Do not type secrets into chat.

An exact number, bare name or common Hinglish dues question takes the fast database path without Groq. Other messages use the existing backend `GROQ_API_KEY`, with an optional `ADMIN_GROQ_MODEL` override; the default is `openai/gpt-oss-20b`. JSON output is schema-validated and capped at 2048 completion tokens, with the existing provider timeout. This uses task instructions and live lookup, not model fine-tuning. Provider failures show an availability message; direct name/mobile lookup remains available. Unsupported or malformed tool output cannot trigger writes.

The balance is current at lookup time, uses all non-cancelled orders (including pending orders), and clamps each order's overpayment to zero due, matching existing accounting behavior. A customer with more than 1000 orders must use the existing Khatabook screen; no truncated balance is presented.

## Deployment

Deploy the updated backend and web frontend together. Keep `GROQ_API_KEY` on the backend only. No new database migration is required. Install admin app dependencies with `npm ci` and create a new signed native build: Sushant Control source version **1.0.5**, Android versionCode **7**. The speech recognition native plugin requires a new APK; old APKs do not gain this feature from a web deployment. Microphone/speech permission is requested only after tapping Voice. Recognition availability depends on the browser/device and speech service. Existing APK download links continue to point to published signed builds.

## Verification

- Integration tests cover authentication/CSRF, PIN gating, duplicate-name choices, actual balance arithmetic, updated payments, cancelled orders, paid accounts, forged/expired/cross-device selections, re-locking, conversation context, provider failure and rejected mutation output.
- Groq request tests verify bounded JSON output for the admin assistant without changing public assistant defaults.
- Backend/web lint, type checks, production build and regression tests; admin app type checks, existing unit tests and Android bundle export.
- Local browser interaction verified the PIN lock, unlock, two same-name options and correct selected balance. Phone-width layout was inspected.
- No production customer data was changed during testing. Live Groq responses were not verified locally because no API key is available in this checkout. Physical Android microphone testing and signed APK delivery remain separate deployment checks.
