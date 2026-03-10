# AI Product Manager — Candidate Assignment

- **Role:** AI Product Manager
- **Estimated effort:** 2–3 days (AI agent assistance encouraged)
- **Submission format:** Working prototype

---

## About this assignment

At Signit, we ship AI-powered products that solve real problems for real users. This
assignment simulates the kind of work you'd do on day one: take an ambiguous,
high-stakes problem, break it into something buildable, design a solution that users
actually want to use, and deliver a working prototype — all with AI tools as your
copilot.

We are not looking for wireframes, Figma mockups, or clickable prototypes. We want a
fully functional, interactive prototype built using any AI-assisted development tool of
your choice (Cursor, Lovable, Bolt, Replit Agent, Claude, Antigravity, etc.). Your
product thinking, UX instincts, and innovation will be what separates great from good.

You can submit multiple prototypes if you would like, but highlight the one you think is
best.

You can deliver an online hosted link or a GitHub repo with instructions on how to run
it.

> We can run anything locally, no worries.

---

## The problem

### Context

Enterprise organizations deal with thousands of contracts every year — vendor
agreements, NDAs, SaaS subscriptions, employment contracts, partnership terms, and
more. These contracts contain obligations, deadlines, auto-renewal traps, penalty
clauses, and compliance requirements buried deep inside dense legal language.

Today, most companies manage this through a painful combination of:

- Shared drives full of PDFs nobody reads after signing
- Spreadsheets tracking renewal dates (often outdated)
- Legal teams manually reviewing contracts when something goes wrong
- People discovering unfavorable terms only after they've been triggered
- Zero visibility into what the organization has actually committed to across all its
  contracts

The result: companies lose money to forgotten auto-renewals, miss critical deadlines,
accept contradictory terms across vendors, and have no way to answer simple questions
like:

> "Which of our vendor contracts have a liability cap below $1M?"
>
> "What contracts are up for renewal in the next 90 days that we should renegotiate?"

---

## The challenge

Design and build a **post-signature contract intelligence system** — an AI-powered
product that turns signed contracts from static, forgotten documents into a live,
queryable, actionable knowledge base for the organization.

This is deliberately **not about e-signatures or contract authoring**. This is about
what happens after a contract is signed — which is where most of the value (and risk)
actually lives.

---

## Who are the users?

You must serve at least these three personas (you may add more if your solution calls
for it):

### 1. Legal counsel

Needs to quickly assess risk exposure across the portfolio, compare terms across
similar contracts, and catch problematic clauses before they become liabilities.
Currently spends hours manually searching through documents.

### 2. Procurement/operations manager

Manages vendor relationships and renewals. Needs to know what's coming up, what terms
they agreed to, and where they have leverage to renegotiate. Currently relies on
calendar reminders and memory.

### 3. Executive (CFO/COO)

Wants a strategic view: total contractual commitments, concentration risk, upcoming
financial obligations, and compliance posture. Currently gets this information weeks
late, if at all.

---

## What we're evaluating

### 1. Problem decomposition and product thinking (30%)

- How well do you understand the real user pain points vs. surface-level symptoms?
- Have you identified the highest-leverage problems to solve first?
- Do your decisions reflect an understanding of what's technically feasible with AI
  today vs. what's aspirational?
- Have you made deliberate trade-offs and can you articulate why?

---

### 2. Solution design and UX innovation (35%)

This is the most heavily weighted criterion. We are looking for:

#### Interaction design that feels new

Generic dashboards with tables and filters are not interesting. How does a user
actually interact with a living contract knowledge base? What paradigms make complex
legal information accessible to non-lawyers?

#### AI-native UX

Don't bolt AI onto a traditional interface. Think about what interactions become
possible when the system understands the content. How do you handle AI confidence and
uncertainty? How does the user build trust in AI-extracted information?

#### Multi-persona coherence

The same underlying data serves very different needs. How do you design for this
without building three separate products?

#### Edge cases and real-world messiness

Contracts come in different formats, languages, and structures. What happens when the
AI is wrong? When a contract is ambiguous? When data is missing?

#### Progressive disclosure

How do you surface the right level of detail at the right moment? A CFO and a lawyer
need very different depths of information from the same contract.

---

### 3. Functional prototype (25%)

- Is it a working, interactive application (not a static mockup)?
- Does it demonstrate the core interactions and flows you've designed?
- Is the UI polished enough to communicate your design intent clearly?
- Have you used realistic sample data that makes the experience feel tangible?
- Does it handle state, navigation, and user flows in a way that feels like a real
  product?

---

### 4. AI integration and innovation (10%)

If your prototype includes live AI features (e.g., actual contract parsing, natural
language queries, AI-generated summaries), that's a strong bonus — but not required.

At minimum, we expect the prototype to simulate AI behavior convincingly enough to
demonstrate how the experience would work.

Bonus points for creative use of AI in the product itself or innovative use of AI tools
in your build process.

---

## Deliverables

### Deliverable 1: Product document

A concise document (max 5 pages) covering:

#### 1. Problem analysis

Your understanding of the problem space. What are the real pain points? What did you
learn that wasn't obvious from the brief? What assumptions are you making?

#### 2. Solution overview

What are you building and why? What's your core insight or thesis about how to solve
this? What did you deliberately leave out and why?

#### 3. User flows and interaction model

How does each persona use the system? What are the key moments of interaction? Walk us
through 2–3 core scenarios.

#### 4. AI architecture (conceptual)

What AI capabilities does your solution rely on? How do you handle accuracy,
confidence, and failure modes? You don't need to build the AI pipeline — just show
you've thought about it seriously.

#### 5. What you'd do with more time

If this were a real project, what would phase 2 look like?

---

### Deliverable 2 (most important): Working prototype

> You can provide multiple prototypes as well.

A fully functional, interactive prototype that demonstrates your core solution.

#### Requirements

- Must be runnable (deployed URL, or local setup with clear instructions)
- Must use realistic, representative sample data (not lorem ipsum)
- Must demonstrate at least 3 distinct user flows
- Must feel like a real product someone could test, not a proof of concept
- Built using any AI-assisted development tool you prefer

---

## What we don't want

- A feature-list product that tries to do everything and does nothing well
- A generic dashboard with charts and tables that could apply to any domain
- A ChatGPT-in-a-box where the only interaction is typing into a chat window
- Wireframes, Figma files, or non-functional prototypes
- A copy of an existing product (we will check)

---

## Practical notes

- **Timeline:** You have around 3 calendar days from receiving this assignment. We know
  you have a life — we're testing quality of thinking, not hours worked.
- **AI tools:** Use whatever AI tools you want. We expect you to. Part of what we're
  evaluating is how effectively you leverage AI to build faster and better. Document
  which tools you used.
- **Sample data:** Create your own realistic sample contracts and data. The quality and
  realism of your test data is part of the evaluation.

---

## A note on what great looks like

The best submissions we've seen in similar assessments share a few traits:

- They pick a sharp angle on the problem rather than trying to boil the ocean
- They introduce at least one interaction pattern that makes us say "oh, that's clever"
- They use AI in the product in a way that feels natural, not forced
- They demonstrate deep empathy for the users — you can tell the candidate actually
  thought about what it feels like to use the product
- The prototype feels surprisingly complete for the timeframe, because the candidate
  used AI tools effectively to build faster

---

Good luck. We're genuinely excited to see what you build.
