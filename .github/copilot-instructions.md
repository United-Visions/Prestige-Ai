## Project AI Instructions

These instructions guide AI coding agents working across both `dyad/` (reference implementation) and `Prestige-Ai/` (target implementation). Focus: bring Dyad’s local AI app scaffolding, lifecycle management, and integration patterns into Prestige-Ai while keeping changes incremental and verifiable.

### 1. Architecture Overview
* Dyad: Electron + Vite + React + local SQLite (Drizzle ORM) + worker threads. Key domains:
  - `src/ipc/handlers/*`: Backend app + chat + integration orchestration (process spawning, proxy, git, Supabase, Vercel).
  - `src/paths/paths.ts`: Central path resolution (userData, app workspace roots) enabling portability & test mode.
  - `src/db/*` + `drizzle.config.ts`: SQLite in userData with generated migrations under `drizzle/`.
  - `scaffold/`: Template React app (shadcn/ui + Tailwind) used for per‑app generation.
  - Process lifecycle: managed via `process_manager` + `app_handlers.executeApp*` capturing stdout/stderr, auto-proxying local server, heuristic stdin responses.
* Prestige-Ai: Earlier-stage Electron + Vite + React setup; simpler build scripts (`electron-builder`) and its own Drizzle config pointing to a flat `prestige-ai.db`. Goal: adopt Dyad app lifecycle + scaffolding + multi-app workspace conventions.

### 2. Integration Priorities (Dyad → Prestige-Ai)
1. Path model: Introduce Dyad-style `getUserDataPath()` & per-app directory strategy (e.g. `~/dyad-apps/<appName>` equivalent) before porting handlers.
2. Database alignment: Migrate Prestige drizzle config to mirror Dyad’s dynamic userData resolution (avoid hard-coded relative path) and adopt migration output placement consistency.
3. IPC & lifecycle: Port minimal subset from `dyad/src/ipc/handlers/app_handlers.ts` needed to:
   - Create app from scaffold template
   - Run app with install+dev fallback command logic
   - Stream process output (stdout/stderr) and detect local URL → proxy
   - Stop/restart and cleanup (port kill + process map removal)
4. Process manager utilities: Recreate lean versions of `withLock`, `process_manager`, `safe_sender`, `start_proxy_server` only when first required.
5. Scaffold parity: Ensure `Prestige-Ai/scaffold/` matches rules in both `scaffold/AI_RULES.md` files; keep React Router route registry in `src/App.tsx`.
6. Error surfacing: Maintain Dyad’s pattern of packaging process output into structured IPC events (`app:output {type, message, appId}`) for UI/agent feedback.

### 3. Conventions & Patterns to Preserve
* File placement: Runtime orchestration stays server-side (Electron main / IPC handlers), UI logic in renderer; no mixing.
* App creation copies scaffold excluding `node_modules`; rely on lazy install at first run.
* Default run command (Dyad): `(pnpm install && pnpm run dev --port 32100) || (npm install --legacy-peer-deps && npm run dev -- --port 32100)` – replicate unless Prestige defines explicit `installCommand` + `startCommand`.
* Proxy pattern: When spawned app logs `http://localhost:<port>`, a proxy worker starts; emit synthetic stdout line describing proxy mapping; UI consumes that to open preview.
* Automated interactive input: Heuristic newline injection only for Drizzle migration prompts in Neon contexts; skip until Neon support exists in Prestige.
* Avoid editing scaffolded shadcn/ui component source; create wrappers/extensions separately in `src/components/`.

### 4. Testing & Validation Workflow
* Use `vitest` for unit tests (Prestige already has dependency). Mirror Dyad test strategy when porting critical utilities (e.g. mock `getUserDataPath`).
* Before integrating large handler chunks, add minimal smoke test for new path util + a dry-run create-app function (no Electron spawn) if Electron context complicates direct execution.
* Ensure database path resolution works both in dev and packaged mode (simulate by setting `NODE_ENV=production` for path fallback logic once ported).

### 5. Build & Run Commands (Do Not Guess — Use These)
* Dyad dev: `npm start` (electron-forge + Vite plugin). Testing: `npm test` or `npm run test:watch`.
* Prestige dev (current): `npm run electron:dev` (concurrently starts Vite + Electron).
* Prestige build (current): `npm run build` then packaged by electron-builder; multi-platform scripts already defined.
* Scaffold app run (target): IPC-triggered spawn with fallback command above; agent should not directly run inside scaffold unless replicating user action.

### 6. Stepwise Porting Plan for Agents
1. Add new shared path utilities to Prestige (mirroring Dyad’s `paths.ts`).
2. Refactor `drizzle.config.ts` to consume dynamic path util (keep existing schema path until schema relocated if needed).
3. Introduce `ipc/` structure in Prestige with minimal `app_handlers` subset (create, run, stop, list running) + process map.
4. Hook handlers into Electron main entry (ensure `ipcMain.handle` registrations occur once).
5. Add proxy worker starter (optional placeholder returning same URL if full proxy not yet ported).
6. Incrementally bring over enhanced features (Supabase, Vercel, Git integration) only after core lifecycle stable.

### 7. Data & State Considerations
* SQLite file location must be stable across restarts; store in userData (Electron `app.getPath('userData')`) not repo root.
* Process map keyed by appId; ensure cleanup on `close` or `error` events to prevent orphan ports.
* When emitting IPC events always sanitize control characters (Dyad uses `util.stripVTControlCharacters`).

### 8. What NOT To Do
* Don’t prematurely copy all Dyad handlers; start with smallest runnable slice.
* Don’t hard-code absolute user paths; always derive via path util.
* Don’t edit scaffold `AI_RULES.md` without updating instructions here (agents rely on alignment).
* Don’t assume package managers; fallback logic must support both `pnpm` and `npm`.

### 9. Quick Reference (Key Source Examples)
* App execution pattern: `dyad/src/ipc/handlers/app_handlers.ts` (`executeAppLocalNode`).
* Path derivation: `dyad/src/paths/paths.ts`.
* Drizzle dynamic config: `dyad/drizzle.config.ts`.
* Scaffold rules: `scaffold/AI_RULES.md` (both projects identical currently).

### 10. Open Questions for Further Refinement
Provide feedback on:
1. Desired priority order for integrations (Supabase vs Git vs Vercel vs multi-app UX).
2. Whether Prestige will adopt multi-app root directory naming (e.g. `prestige-apps/`).
3. Need for immediate proxy worker parity or phased (log-only) approach.

Respond with clarifications to expand sections 6–10. This document will iterate as capabilities are ported.
