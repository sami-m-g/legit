# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
bun dev        # Next.js dev server with Turbopack
bun dev:agent  # Mastra agent dev server (separate process)
bun check      # Biome lint/format + TypeScript type check (run before commits)
bun fmt        # Auto-format with Biome
bun lint       # Lint with Biome
bun test       # Test with built in bun:test
bun build      # Production build
```

## Dev Setup

```bash
bun dev            # Next.js dev server (port 3000) — this is all you need for the app
bun run dev:agent  # Mastra agent dev server (port 4111) — only needed for Mastra agent UI, not the app
```

## Testing

```bash
bun test                     # Run all tests
bun test src/lib/__tests__/  # Run specific directory
```

Test files live in `src/lib/__tests__/`. Tests pin a fixed `today` date for determinism.

## Architecture

**Contract Advisor Platform** — a contract advisor, not a contract manager. Upload PDF contracts, extract structured metadata and risk intelligence via LLM, surface actionable guidance through three AI surfaces plus Smart Actions.

### Stack

- **Frontend**: Next.js 16 (App Router), React 19, TailwindCSS v4, shadcn/ui, CopilotKit sidebar
- **AI/Agent**: Mastra framework + Ollama Cloud (hosted LLM — `ollama-cloud/minimax-m2.5`)
- **Storage**: Vercel Postgres (metadata), Vercel Blob (PDFs)
- **Linter/Formatter**: Biome (not ESLint/Prettier)

### Three AI Surfaces

1. **Briefing** — AI narrative memo that synthesizes the portfolio picture: what's urgent, cross-contract patterns, where to focus. Powered by `src/lib/narrative.ts` (LLM generation) + `src/lib/portfolio-analysis.ts` (deterministic cross-contract analysis). Regenerates live — always reflects current portfolio state.
2. **Action Feed** — Contracts sorted by urgency (urgent/watch/info). Each card shows risk flags, confidence status, and inline actions: flag for review, mark reviewed, generate smart action. Powered by `src/lib/briefing-rules.ts` (classification) + `src/lib/briefing.ts` (DB queries). Served by `GET /api/briefing`.
3. **Advisor** — Conversational agent across the full portfolio via CopilotKit sidebar. Queries structured data, not raw PDFs. Powered by Mastra `contractAgent` with tools: `searchContracts`, `getContractDetails`, `queryContracts`.

### Smart Actions

One-click AI-drafted outputs triggered from feed cards: cancellation notices, negotiation briefs, risk summaries. `/api/contracts/[id]/draft-action` generates drafts via LLM — always human-reviewed before sending.

### Confidence Model

Every extracted field is either **verified** or **needs-review** (binary). The LLM produces a float confidence score internally; a threshold converts it to binary status. Needs-review items surface in the feed for human confirmation. This replaces the old percentage display (e.g., "Confidence: 92%").

### Data Flow

1. **Upload**: `POST /api/contracts/upload` → pdf-parse extracts text → `extractContractData()` in `src/lib/extraction.ts` sends first 12K chars to Ollama → structured JSON (metadata + risk fields + float confidence) stored in Vercel Postgres + blob URL saved. Confidence below threshold → "needs-review" status.
2. **Briefing (live)**: `GET /api/briefing` queries all active contracts, runs `classifyContract()` per contract → returns prioritized feed items. No caching — always reflects current data.
3. **List/View**: `GET /api/contracts/list` and `GET /api/contracts/[id]` serve metadata from Postgres
4. **Agent queries**: CopilotKit sidebar → `POST /api/copilotkit` → Mastra `contractAgent` (`src/mastra/agents/contractAgent.ts`) with three tools: `searchContracts`, `getContractDetails`, `queryContracts`
5. **Smart Actions**: Feed card → `POST /api/contracts/[id]/draft-action` → LLM generates cancellation notice, negotiation brief, or risk summary → user reviews and sends

### Database Schema

- **`contracts`** table — core metadata plus `risk_score` (int), `risk_flags` (jsonb array), `negotiation_points` (jsonb array), `extraction_confidence` (float). Binary confidence status (verified/needs-review) is derived from the float at a threshold — not stored separately.
- **`briefing_narratives`** table — exists but currently unused. Briefing is live (recomputed on every request).
- **Action statuses**: active, flagged, reviewed, cancelled. "Flag for review" keeps items visible as pending; there is no snooze. The `snoozed_until` column exists in the schema but is unused.

### Key Files

**Core logic:**

- `src/lib/briefing-rules.ts` — Pure classification logic: `classifyContract()` maps ContractRow → BriefingItem | null. Thresholds: `COMPANY_LIABILITY_THRESHOLD` ($1M), `LOW_CONFIDENCE_THRESHOLD` (0.7). No DB dependency — fully unit-tested.
- `src/lib/briefing.ts` — DB query layer: fetches active contracts and runs them through `classifyContract()`
- `src/lib/narrative.ts` — AI narrative briefing generation using `extractionAgent`
- `src/lib/portfolio-analysis.ts` — Four deterministic cross-contract detectors: `detectVendorDependency()`, `detectTermsInconsistency()`, `detectLiabilityOutlier()`, `detectRiskHotspot()`, orchestrated by `computePortfolioIntelligence()`
- `src/lib/portfolio-briefing.ts` — Feeds portfolio intelligence into the briefing surface
- `src/lib/cross-vendor.ts` — Cross-vendor analysis utilities
- `src/lib/extraction.ts` — PDF text extraction + LLM-based structured data extraction (metadata + risk_score, risk_flags, negotiation_points, extraction_confidence in single call)
- `src/lib/types.ts` — Shared TypeScript types (Contract, ExtractedData, BriefingItem, PortfolioIntelligence, ActionStatus, etc.)
- `src/lib/utils.ts` — Shared utilities: `daysUntil(date, from?)`, `futureDateString(days)`, `getConfidenceStatus(confidence)`
- `src/lib/db.ts` — Vercel Postgres client + `contracts` table schema
- `src/lib/sample-data.ts` — `SEED_FILENAMES: string[]` — the 12 PDF filenames in `public/contracts/` used by the seed route

**API routes:**

- `src/app/api/briefing/route.ts` — `GET /api/briefing` returns `{ items, intelligence, contractCount }` — contract-sourced briefing items only (no portfolio items in feed)
- `src/app/api/briefing/narrative/route.ts` — `GET /api/briefing/narrative` generates AI narrative briefing via LLM
- `src/app/api/portfolio/route.ts` — `GET /api/portfolio` runs `computePortfolioIntelligence()` and returns `{ intelligence: PortfolioIntelligence }`
- `src/app/api/contracts/[id]/draft-action/route.ts` — `POST` generates smart action drafts (cancellation-notice, negotiation-brief, risk-summary) via LLM
- `src/app/api/contracts/[id]/action/route.ts` — `POST` updates action_status (active/flagged/reviewed/cancelled)
- `src/app/api/contracts/[id]/execute-action/route.ts` — `POST` executes actions (updates action_status)
- `src/app/api/seed/route.ts` — `POST /api/seed` reads PDFs from `public/contracts/`, runs extraction pipeline, inserts into DB
- `src/app/api/copilotkit/route.ts` — CopilotKit ↔ Mastra bridge (agent entry point)
- `src/app/api/contracts/[id]/pdf/route.ts` — PDF proxy; redirects local paths and proxies Vercel Blob URLs

**UI components** (all shadcn/ui-based):

- `src/components/briefing-narrative.tsx` — Briefing surface: portfolio stats, portfolio flags, AI narrative memo
- `src/components/briefing-feed.tsx` — Action Feed surface: renders prioritized list of contract briefing cards (no portfolio items)
- `src/components/briefing-card.tsx` — Individual feed card with urgency, risk flags, inline actions
- `src/components/contract-list.tsx` — Contract list/table view
- `src/components/contract-upload.tsx` — PDF upload form
- `src/components/contract-viewer.tsx` — Contract detail view with Risk/Advice tabs
- `src/components/ui/` — shadcn/ui primitives: button, badge, card, tabs, separator, alert, skeleton

**Agent:**

- `src/mastra/agents/contractAgent.ts` — Advisor agent definition with contract tools (searchContracts, getContractDetails, queryContracts)
- `src/mastra/agents/extractionAgent.ts` — LLM agent used for contract data extraction and narrative briefing generation
- `src/mastra/tools/contracts.ts` — Tool implementations for contractAgent
- `src/mastra/index.ts` — Mastra framework entry point (registers both agents)

**Static assets:**

- `public/contracts/` — Static PDFs for the 12 seeded sample contracts

### Styling

`src/app/globals.css` defines CSS custom properties for the cream/ivory theme. Key tokens: `--bg-base: #faf8f4`, `--gold: #92400e` (amber accent), `--on-gold` (text on gold buttons), `--bg-pdf-viewer` (PDF iframe surround). shadcn/ui CSS vars (`--background`, `--foreground`, `--primary`, etc.) are mapped to these cream tokens. Prefer Tailwind utility classes (`text-foreground`, `text-muted-foreground`, `bg-card`) over inline `var(--*)` styles.

### Environment

See `.env.example` for required variables. `src/lib/env.ts` validates at startup. Required: `POSTGRES_URL`, `BLOB_READ_WRITE_TOKEN`. Optional with defaults: `OLLAMA_BASE_URL` (defaults to `https://ollama.com`), `OLLAMA_API_KEY`, `OLLAMA_MODEL` (defaults to `ollama-cloud/minimax-m2.5`).
