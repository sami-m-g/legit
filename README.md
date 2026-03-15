# Legit — Contract Advisor Platform

[![CI](https://github.com/sami-m-g/legit/actions/workflows/ci.yml/badge.svg)](https://github.com/sami-m-g/legit/actions/workflows/ci.yml)
![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=nextdotjs)
![React](https://img.shields.io/badge/React-19-61dafb?style=flat-square&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?style=flat-square&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-4-38bdf8?style=flat-square&logo=tailwindcss&logoColor=white)
![shadcn/ui](https://img.shields.io/badge/shadcn%2Fui-4.0-black?style=flat-square&logo=shadcnui&logoColor=white)
![Bun](https://img.shields.io/badge/Bun-1.3-fbf0df?style=flat-square&logo=bun)
![CopilotKit](https://img.shields.io/badge/CopilotKit-1.54-black?style=flat-square)
![Mastra](https://img.shields.io/badge/Mastra-beta-6d28d9?style=flat-square)
![Biome](https://img.shields.io/badge/Biome-toolchain-60a5fa?style=flat-square&logo=biome&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-hosting-black?style=flat-square&logo=vercel&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-336791?style=flat-square&logo=postgresql&logoColor=white)
![Ollama](https://img.shields.io/badge/Ollama_Cloud-LLM-black?style=flat-square&logo=ollama&logoColor=white)
![License](https://img.shields.io/badge/license-AGPL--3.0-gold?style=flat-square)

An AI-powered contract advisor that watches your signed contracts and tells you what needs attention, why it matters, and what to do next.

> See [docs/problem_statement.md](docs/problem_statement.md) for the full assignment brief and [docs/product_document.md](docs/product_document.md) for the product design rationale.

## Three AI Surfaces

- **Briefing** — AI narrative memo synthesizing what's urgent across your portfolio
- **Action Feed** — Contracts sorted by urgency with inline actions (flag, review, draft response)
- **Advisor** — Conversational agent for ad-hoc portfolio queries via CopilotKit sidebar

## Quick Start

```bash
# Install dependencies
bun install

# Set up environment (see .env.example)
cp .env.example .env.local

# Run dev server
bun dev

# Seed sample contracts (hit this once after DB is set up)
curl -X POST http://localhost:3000/api/seed
```

## Scripts

```bash
bun dev          # Dev server (port 3000)
bun dev:agent    # Mastra agent dev server (port 4111)
bun check        # Lint + format + type check
bun test         # Run tests
bun build        # Production build
```
