# Tasks

## 1. Database Schema & Migration Setup

- [x] 1.1 Add `apiKeys` table definition to `src/api/db/schema.ts` (fields: `id`, `userId`, `name`, `keyPrefix`, `keyHash`, `stockId`, `scopes`, `createdAt`, `lastUsedAt`, `revokedAt`) and verify TypeScript types export cleanly.
- [x] 1.2 Generate D1 migration file via `npm run db:generate` and verify the generated SQL migration file under `drizzle/`.

## 2. API Key Management & Dual-Mode Auth Middleware

## 2. API Key Management & Dual-Mode Auth Middleware

- [x] 2.1 Implement API Key cryptographic utilities in `src/api/utils/apiKey.ts` (generating 72-char `ab_live_<hex>` tokens, computing SHA-256 hash, and extracting prefix).
- [x] 2.2 Implement API Key management routes in `src/api/routes/apiKeys.ts` (`POST /api/keys` to generate, `GET /api/keys` to list, `DELETE /api/keys/:id` to revoke) and register in `src/api/index.ts`.
- [x] 2.3 Extend `authMiddleware` in `src/api/middleware/auth.ts` to support dual-mode authentication: inspect `Authorization: Bearer ab_live_...`, verify hash against active keys, update `lastUsedAt`, and populate user and apiKey context.
- [x] 2.4 Add automated tests in `tests/api_keys_and_auth.test.ts` verifying key creation, SHA-256 hash matching, session vs Bearer dual-mode auth, and rejection of revoked keys.

## 3. Agent Semantic REST API (/api/v1/...)

- [x] 3.1 Implement `GET /api/v1/openapi.json` returning complete OpenAPI 3.1 schema for ChatGPT Actions.
- [x] 3.2 Implement `GET /api/v1/items` with status filters (`overdue`, `due_soon`, `low_stock`, `all`), search (`q`), category filters, and Taiwan timezone lifecycle calculations in `src/api/routes/agentApi.ts`.
- [x] 3.3 Implement `POST /api/v1/items`, `GET /api/v1/items/:id`, `PATCH /api/v1/items/:id`, and `DELETE /api/v1/items/:id` with complete validation and stock ownership enforcement.
- [x] 3.4 Implement `POST /api/v1/items/:id/replace` (automatic replacement cycle reset and atomic stock deduction) and `POST /api/v1/items/:id/consume` (quantity reduction with clamp to zero).
- [x] 3.5 Implement `GET /api/v1/stocks` to return sanitized stock spaces for the authenticated user.
- [x] 3.6 Add automated tests in `tests/agent_api_v1.test.ts` verifying all CRUD endpoints, filter queries, quick actions, and unauthorized access rejections.

## 4. Agent Skill Specification & LLM Index Documents

- [x] 4.1 Author `public/skill.md` with complete skill metadata, OpenAPI schema mapping, tool conventions, and few-shot natural language prompts for external AI agents.
- [x] 4.2 Update `/llms.txt` and `public/llms-full.txt` with v1 Agent API details, consumable lifecycle concepts, and endpoint reference.
- [x] 4.3 Ensure `GET /skill.md` and `GET /llms.txt` are served with proper `text/markdown` / `text/plain` headers across local preview and production Worker.

## 5. Frontend Settings UI & Prompt Generator

- [x] 5.1 Add "AI Agent 連動與 API Key" section in `src/client/views/SettingsView.tsx` with "建立新金鑰" dialog (optional stock scope), secure one-time secret display, and active key list with revoke button.
- [x] 5.2 Add dynamic "Agent System Prompt 產生器" in `SettingsView.tsx` with dual tabs: "ChatGPT GPT Actions（OpenAPI URL & 設定導引）" and "Claude / Cursor / 通用 Prompt（一鍵複製含 Key 提示詞）".
- [x] 5.3 Verify responsive layout (iOS Home Bar safe area, dark/light theme, and mobile tactile press feedback).

## 6. Verification, D1 Remote Migration & Deployment

- [x] 6.1 Run full test suite (`npm test`) and frontend production build (`npm run build`) ensuring 100% green tests.
- [x] 6.2 Apply D1 migrations to remote databases (`npm run db:migrate:ai360` and `npm run db:migrate:david`).
- [x] 6.3 Deploy to both production environments via `npm run deploy:all`.
- [x] 6.4 Update `CHANGELOG.md` under `## 2026-10-07` and update `README.md` to document the new AI Agent Skill and API Key capabilities.
