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

Run both servers simultaneously for full functionality:

```bash
bun dev          # Terminal 1 — Next.js (port 3000)
bun run dev:agent  # Terminal 2 — Mastra agent (port 4111)
```

## Testing

```bash
bun test                     # Run all tests
bun test src/lib/__tests__/  # Run specific directory
```

Test files live in `src/lib/__tests__/`. Tests pin a fixed `today` date for determinism.

## Architecture

**Contract Intelligence Platform** — upload PDF contracts, extract structured metadata via LLM, query via natural language agent.

### Stack

- **Frontend**: Next.js 15 (App Router), React 19, TailwindCSS, shadcn/ui, CopilotKit sidebar
- **AI/Agent**: Mastra framework + Ollama (local LLM)
- **Storage**: Vercel Postgres (metadata), Vercel Blob (PDFs)
- **Linter/Formatter**: Biome (not ESLint/Prettier)

### Data Flow

1. **Upload**: `POST /api/contracts/upload` → pdf-parse extracts text → `extractContractData()` in `src/lib/extraction.ts` sends first 12K chars to Ollama → structured JSON stored in Vercel Postgres + blob URL saved
2. **List/View**: `GET /api/contracts/list` and `GET /api/contracts/[id]` serve metadata from Postgres
3. **Agent queries**: CopilotKit sidebar → `POST /api/copilotkit` → Mastra `contractAgent` (`src/mastra/agents/index.ts`) with three tools: `searchContracts`, `getContractDetails`, `queryContracts`

### Key Files

- `src/lib/briefing-rules.ts` — Pure classification logic: `classifyContract()` maps ContractRow → BriefingItem | null. Thresholds: `COMPANY_LIABILITY_THRESHOLD` ($1M), `LOW_CONFIDENCE_THRESHOLD` (0.7). No DB dependency — fully unit-tested.
- `src/lib/briefing.ts` — DB query layer: fetches active contracts and runs them through `classifyContract()`
- `src/app/api/briefing/route.ts` — `GET /api/briefing` returns today's briefing items
- `src/app/api/contracts/[id]/action/route.ts` — `POST` updates `action_status` (active/flagged/reviewed/cancelled/snoozed)
- `src/app/api/seed/route.ts` — `POST /api/seed` reads PDFs from `public/contracts/`, runs each through the real extraction pipeline (`extractTextFromPdf` → `extractContractData`), and inserts into DB
- `src/components/` — UI components built with shadcn/ui: `briefing-feed.tsx`, `briefing-card.tsx`, `contract-list.tsx`, `contract-upload.tsx`, `contract-viewer.tsx` (Tabs sidebar), `renewals-timeline.tsx`, `vendor-groups.tsx`
- `src/components/ui/` — shadcn/ui primitives: button, badge, card, tabs, separator, alert, skeleton
- `src/lib/db.ts` — Vercel Postgres client + `contracts` table schema
- `src/lib/extraction.ts` — PDF text extraction + LLM-based structured data extraction
- `src/lib/types.ts` — Shared TypeScript types (Contract, ExtractedData, etc.)
- `src/lib/utils.ts` — Shared utilities: `daysUntil(date, from?)` and `futureDateString(days)`
- `src/lib/sample-data.ts` — `SEED_FILENAMES: string[]` — the 10 PDF filenames in `public/contracts/` used by the seed route
- `src/mastra/agents/index.ts` — Mastra agent definition with tools and memory
- `src/mastra/tools/contracts.ts` — Tool implementations (searchContracts, getContractDetails, queryContracts)
- `src/app/api/copilotkit/route.ts` — CopilotKit ↔ Mastra bridge (agent entry point)
- `src/app/api/contracts/` — REST API routes
- `src/app/api/contracts/[id]/pdf/route.ts` — PDF proxy; redirects local `/contracts/...` paths (seeded contracts) and proxies Vercel Blob URLs
- `public/contracts/` — Static PDFs for the 10 seeded sample contracts, served by Next.js

### Styling

`src/app/globals.css` defines CSS custom properties for the cream/ivory theme. Key tokens: `--bg-base: #faf8f4`, `--gold: #92400e` (amber accent), `--on-gold` (text on gold buttons), `--bg-pdf-viewer` (PDF iframe surround). shadcn/ui CSS vars (`--background`, `--foreground`, `--primary`, etc.) are mapped to these cream tokens. Prefer Tailwind utility classes (`text-foreground`, `text-muted-foreground`, `bg-card`) over inline `var(--*)` styles.

### Environment

See `.env.example` for required variables. `src/lib/env.ts` validates at startup: `OLLAMA_BASE_URL`, `OLLAMA_API_KEY`, Vercel Postgres connection string, and Vercel Blob token.
