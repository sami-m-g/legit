# Legit — Contract Intelligence Platform

![Tests](https://img.shields.io/badge/tests-19%20passing-brightgreen?style=flat-square)
![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?style=flat-square&logo=typescript&logoColor=white)
![Bun](https://img.shields.io/badge/Bun-1.3-fbf0df?style=flat-square&logo=bun)
![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-4-38bdf8?style=flat-square&logo=tailwindcss&logoColor=white)
![Postgres](https://img.shields.io/badge/Postgres-Vercel-336791?style=flat-square&logo=postgresql&logoColor=white)
![License](https://img.shields.io/badge/license-AGPL--3.0-gold?style=flat-square)

A post-signature contract intelligence system for enterprise teams. Upload signed PDF contracts, extract structured metadata via a local LLM, and surface actionable intelligence through a prioritized briefing feed, renewals timeline, vendor grouping, and a natural language AI assistant.

---

## 1. Problem Analysis

### The actual problem

Enterprise organizations accumulate hundreds of signed contracts that nobody reads again until something goes wrong — a missed renewal, an unexpected auto-renewal charge, or a liability clause that surfaces during litigation. The problem is not that contracts are hard to find; it is that the obligations and risks buried inside them are invisible until they become urgent.

Existing tooling is built for the pre-signature phase: drafting, redlining, approvals. Post-signature, most companies fall back to spreadsheets and calendar reminders maintained by one person who eventually leaves.

### What the brief does not say explicitly

- **Volume makes manual review impossible.** A mid-size company with 500 active contracts cannot have legal review each one monthly. Intelligence must be automated and triage must be pre-computed.
- **Three different people care about contracts for three different reasons.** Legal counsel wants clause-level detail. Operations wants renewal windows. Executives want financial exposure. A single dashboard that tries to serve all three usually serves none of them well.
- **Extraction will fail sometimes.** Scanned PDFs, non-standard layouts, and poor OCR quality mean structured extraction will occasionally produce wrong or partial results. A system that does not surface extraction confidence is worse than useless — it creates false certainty.
- **The most valuable moment is the briefing, not the archive.** Users do not want to query a database; they want to open a tool and immediately know what requires attention today.

### Assumptions made

- Contracts are already signed and in PDF format. Contract authoring and e-signature are out of scope.
- A single organization is using the system. Multi-tenant isolation and role-based access control are deferred.
- Ollama is available locally or via a reachable endpoint. In production this would be replaced with a managed LLM API.
- Financial values in contracts are in USD.
- "Renewal within 45 days" and "expiration within 90 days" are reasonable urgency thresholds for a general-purpose system; these would be configurable in production.

---

## 2. Solution Overview

### Core thesis

Replace the post-signature black hole with an intelligence layer that tells the right person the right thing at the right time. The primary surface is a prioritized briefing feed — not a generic dashboard — so that every session starts with what needs attention, not with a blank search box.

### What is built

- **PDF ingestion pipeline**: Upload a contract PDF, extract raw text with `pdf-parse`, send the first 12,000 characters to a local Ollama model, receive structured JSON (title, type, parties, dates, contract value, liability cap, key obligations, termination clauses, confidence score).
- **Smart briefing feed**: Contracts are automatically classified into Urgent / Watch / Info based on deterministic rules: auto-renewal within 45 days, expiration within 90 days, liability cap below $1M, low extraction confidence. Each card exposes inline actions.
- **Action system**: Flag for Legal, Mark Reviewed, Cancel/Terminate, Snooze 7 days — all operable directly from the briefing feed without opening the contract.
- **Lens tabs**: All Contracts list, Renewals Timeline (visual), By Vendor (grouped).
- **Contract viewer**: Side-by-side PDF display and structured metadata panel with confidence indicators.
- **Natural language agent**: CopilotKit sidebar backed by a Mastra agent with three tools — `searchContracts`, `getContractDetails`, `queryContracts` — allowing free-form queries over the contract portfolio.
- **Sample data seeder**: 10 realistic enterprise contracts for immediate evaluation.

### What was deliberately left out

Contract authoring, redlining, and e-signature workflows are pre-signature concerns handled by existing tools (Ironclad, DocuSign). Multi-user roles, notifications and email alerts, and a contract comparison UI are valid Phase 2 additions but were excluded to keep scope coherent and the codebase evaluable. The goal was depth on the post-signature intelligence problem, not breadth across the full contract lifecycle.

---

## 3. User Flows and Interaction Model

### Persona 1: Legal Counsel

#### Scenario — Risk review of an incoming contract batch

Legal uploads three new vendor agreements via the Upload panel. The system extracts metadata and immediately classifies them. One contract surfaces in Urgent because its liability cap is below $1M with a confidence score of 61%. Legal opens the contract viewer, reviews the structured metadata panel alongside the original PDF, and flags it for deeper review using the "Flag for Legal" action. The confidence indicator tells them the extraction was partial — they know to verify the clause manually rather than trusting the extracted value.

### Persona 2: Procurement / Operations Manager

#### Scenario — Monthly renewal check

The operations manager opens the app and lands on the briefing feed. Two contracts appear in Urgent with auto-renewal alerts: one SaaS subscription renews in 12 days, another in 38 days. They switch to the Renewals Timeline lens to see the full 12-month picture. For the 12-day contract they have already decided not to renew — they click "Cancel/Terminate" directly from the feed. For the 38-day contract they need more time — they snooze it 7 days to revisit after budget approval.

### Persona 3: Executive (CFO / COO)

#### Scenario — Quarterly liability exposure review

The CFO opens the app and asks the natural language assistant: "What is our total contract value with cloud vendors, and which ones have liability caps below $1M?" The Mastra agent runs `queryContracts` and `searchContracts`, then returns a structured answer with contract names, values, and liability figures. The CFO does not need to open individual contracts or know SQL — the agent synthesizes the portfolio view on demand.

---

## 4. AI Architecture

### Extraction pipeline

```text
PDF upload
  → pdf-parse (raw text extraction)
  → first 12,000 characters sent to Ollama
  → structured prompt requesting JSON output
  → parsed and validated in src/lib/extraction.ts
  → stored in Vercel Postgres (metadata) + Vercel Blob (PDF file)
```

The prompt instructs the model to return a fixed JSON schema: `title`, `contractType`, `parties` (array), `effectiveDate`, `expirationDate`, `autoRenewal` (boolean), `renewalNoticeDays`, `contractValue`, `liabilityCap`, `keyObligations` (array), `terminationClauses` (array), `confidenceScore` (0–100).

### Confidence and failure handling

The confidence score is model-generated: the LLM is explicitly asked to assess how complete and reliable its own extraction was given the text quality and structure. This is surfaced in the UI rather than hidden. Contracts with confidence below 70% are flagged in the briefing feed, and the contract viewer displays the score prominently alongside the metadata.

Partial failures — malformed JSON, missing required fields — are caught in `extractContractData()` and result in a contract record with `extractionStatus: 'partial'` and a low synthetic confidence score. The contract is still stored and accessible; there is no silent failure.

### Mastra agent tools

The agent (`src/mastra/agents/index.ts`) is defined with three tools implemented in `src/mastra/tools/contracts.ts`:

- **`searchContracts`**: Full-text search across contract titles, party names, and contract type. Returns a ranked list of matching contracts.
- **`getContractDetails`**: Retrieves full structured metadata for a specific contract by ID.
- **`queryContracts`**: Executes filtered queries by date range, contract type, value threshold, or vendor name, and returns aggregated results.

The agent has session memory via Mastra's built-in memory module, so follow-up questions within a session are contextually aware.

### What would be different in production

|:-------------------:|:---------------------------:|:-----------------------------------------------------:|
| LLM provider        | Ollama (local)              | Managed API (Anthropic, OpenAI) with fallback         |
| Extraction quality  | Single-pass prompt          | Multi-pass with validation round                      |
| OCR                 | pdf-parse (text layer only) | Dedicated OCR pipeline for scanned PDFs               |
| Confidence scoring  | Model self-assessment       | Calibrated scoring model trained on labeled contracts |
| Rate limiting       | None                        | Queue-based with retry and backoff                    |
| Extraction failures | Stored as partial           | Routed to human review queue                          |

---

## 5. What's Next

### Phase 2 — Depth on existing features

- Configurable urgency thresholds per organization (renewal window, liability floor)
- Clause-level extraction with cross-contract comparison ("show me all indemnification clauses across active MSAs")
- Extraction correction UI — allow legal to correct a wrong field and feed corrections back into prompt improvement
- Bulk upload with background processing queue and status tracking

### Phase 3 — Collaboration and workflow

- Multi-user with role-based access (legal, procurement, executive read-only)
- Comment threads on contracts
- Email and Slack notifications for approaching renewals
- Audit log of all actions taken

### Phase 4 — Intelligence layer expansion

- Anomaly detection: flag contracts whose terms deviate significantly from portfolio baseline
- Vendor risk scoring: aggregate liability exposure and payment obligations by vendor
- Contract comparison: side-by-side diff of two contracts of the same type
- Integration with procurement systems (Coupa, SAP Ariba) for spend reconciliation

---

## 6. Setup and Running

### Prerequisites

- Node.js 20+
- [Bun](https://bun.sh) (`npm install -g bun`)
- [Ollama](https://ollama.ai) running locally or at a reachable endpoint, with a model pulled (e.g. `ollama pull llama3.2`)
- Vercel Postgres database
- Vercel Blob storage

### Environment variables

Copy `.env.example` to `.env.local` and fill in the values:

```bash
cp .env.example .env.local
```

```bash
OLLAMA_API_KEY=          # API key if your Ollama endpoint requires auth; leave blank for local
OLLAMA_MODEL=            # Model name, e.g. llama3.2
BLOB_READ_WRITE_TOKEN=   # Vercel Blob token
POSTGRES_URL=            # Vercel Postgres connection string
```

### Install dependencies

```bash
bun install
```

### Run the development servers

Both servers must be running simultaneously for full functionality.

```bash
# Terminal 1 — Next.js frontend (port 3000)
bun dev

# Terminal 2 — Mastra agent server (port 4111)
bun run dev:agent
```

Open [http://localhost:3000](http://localhost:3000).

### Load sample data

Click the **"Load sample data"** button in the UI to seed the database with 10 realistic enterprise contracts. This lets you evaluate all features immediately without uploading your own PDFs.

### Other commands

```bash
bun run check    # Biome lint/format + TypeScript type check (run before commits)
bun run fmt      # Auto-format with Biome
bun run build    # Production build
```
