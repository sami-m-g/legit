# Legit — Product Document

## 1. Problem Analysis

### The real pain point

Forgotten auto-renewals, missed deadlines, contradictory terms, no portfolio visibility — these are all symptoms of the same underlying problem:

> *"I don't know what I don't know. Something in one of these contracts is going to bite me, and I won't find out until it's too late and it costs money."*

This isn't a search problem — nobody needs better Ctrl+F for PDFs. It's a **clarity problem**. The people responsible for contract commitments — legal, procurement, finance — aren't lacking tools. They're lacking direction: what needs attention right now, what's coming next, and what to do about it. The value isn't in storing or finding contracts. It's in **always being on top of what needs to be done** across the entire portfolio — without having to read every contract yourself.

### What wasn't obvious from the brief

**The gap is judgment, not data.** Post-signature, most organizations fall back to spreadsheets and calendar reminders — tools that surface metadata without interpretation. They can tell you a contract expires June 15th. They can't connect it to the two other contracts with the same vendor, flag that combined exposure exceeds a threshold, or tell you the termination clause requires a registered letter — not an email. People don't need a dashboard; they need an advisor that tells them what to do and why.

**Volume makes this a machine problem.** A mid-size company with hundreds of active contracts cannot have legal review each one regularly. No individual — and no team — can hold the full picture of what the organization has committed to. The only way to stay on top of it all is automated intelligence that continuously reads, triages, and prioritizes — so that humans spend their time acting, not searching.

### Assumptions

- Users interact in bursts — Monday mornings, before quarterly reviews, when a vendor negotiation starts — not continuously. The system must deliver value in the first 10 seconds of a session.
- The most expensive failure mode isn't wrong extraction; it's *confident* wrong extraction that goes unreviewed. The system should be more afraid of false certainty than of flagging too many items for review.

---

## 2. Solution Overview

### Core thesis

Legit is a **contract advisor, not a contract manager.** It watches the contracts you've already signed and tells you what to do about them. Open the app, and within seconds you know: *what needs attention, why it matters, and what to do next.*

Three AI surfaces make this work:

**Briefing** — Like a note from a colleague who read every contract overnight. An AI narrative memo that calls out what's urgent by name, connects the dots across your portfolio, and tells you where to focus. This is what you see first — not a search box.

**Action Feed** — Your working surface. Contracts sorted by urgency — renewals, risks, items needing review — each with inline actions: flag for legal, mark reviewed, or generate a smart action. Scan, decide, act, move on. No clicking into contracts unless you want to.

**Advisor** — For the questions the feed doesn't answer. A conversational agent across the full portfolio: *"Which vendors have liability caps below $1M?"* For when you need to explore, not just triage.

### Smart Actions

Flag a contract for cancellation and Legit drafts the termination letter — citing the right clauses, the right notice period, ready to send. Negotiation brief? One click. Risk escalation memo? One click.

Most tools stop at showing you information. Legit takes you from *"this needs attention"* to *"here's the drafted response"* without leaving the app.

### Confidence model

AI extraction will be wrong sometimes. Instead of a percentage score users learn to ignore, every field is either **verified** or **needs-review**. Needs-review isn't a label — it's a prompt: the contract surfaces in your feed asking you to confirm or correct. The system learns from corrections, and nobody makes decisions on data the AI wasn't sure about.

### What's deliberately out of scope

- **Role-based access control** — the product needs to prove the core thesis (advisor, not manager) before layering on permission models. Multi-persona is solved through progressive disclosure, not separate dashboards.
- **Contract comparison UI** — interesting for legal deep-dives, but the briefing + advisor already cover the highest-urgency cross-contract questions.

---

## 3. User Flows

Three scenarios, one for each persona. All three use the same product — they just lean on different surfaces.

### Scenario 1: Legal counsel — risk triage

Legal opens the app. The **briefing** gives the portfolio picture: 47 active contracts, $12M total committed value, 3 items flagged for attention this week — including a newly uploaded vendor agreement with a high risk score.

In the **feed**, that contract sits at the top, marked urgent. The card shows specific flags: a one-sided indemnification clause and a liability cap below threshold. One field — the termination notice period — is marked *needs-review*. Legal expands the contract viewer to check that clause against the PDF, confirms the correct value, and moves on.

From the same feed card, they hit **Smart Action → Risk Summary**. Legit drafts an escalation memo referencing the flagged clauses. Legal edits the language, forwards it to the VP. They never read 40 pages — the feed told them which 3 clauses mattered.

### Scenario 2: Procurement — renewal decision

The procurement manager opens the app. The **briefing** gives the same portfolio picture — but what catches their eye is the renewal summary: 2 contracts approaching decision windows, one in 12 days with an auto-renewal clause.

In the **feed**, the 12-day contract is at the top. The card notes the termination clause requires written notice via registered mail — not email. They've already decided not to renew, so they hit **Smart Action → Cancellation Notice**. Legit drafts a termination letter citing the notice clause and delivery requirement. They review, adjust, send. Without Legit, this deadline would have passed — the spreadsheet tracking it hadn't been updated in months.

The 38-day contract needs budget approval first. They **flag it for review** — it stays visible in the feed as pending action, so it won't slip through when approval comes through.

### Scenario 3: Executive — exposure check

The CFO opens the app before a board meeting. The **briefing** shows the same portfolio picture everyone sees — total committed value, contracts expiring this quarter, vendor concentration. A flag surfaces that the majority of SaaS spend is concentrated in a single vendor — a risk nobody had seen because no one had ever looked at contracts in aggregate.

They need a specific number for the board deck. They open the **advisor**: *"What's our total liability exposure to cloud infrastructure vendors?"* The answer comes back with a breakdown by vendor. That insight — and the concentration flag — go straight into the presentation. No contracts opened, no report requested from legal.

---

## 4. AI Architecture (Conceptual)

Five AI capabilities, none requiring novel research — existing LLM strengths combined with straightforward engineering.

```text
              PDF Upload
                  │
                  ▼
      Text Extraction (pdf-parse)
                  │
                  ▼
      Single-Pass LLM Extraction
        outputs: metadata, risk intel, confidence
        confidence < threshold → "needs-review"
                  │
                  ▼
  ┌───────────────────────────────────┐
  │     Structured Data (Postgres)    │◄─── actions update data
  └───────┬───────────┬───────────┬───┘
          │           │           │
          ▼           ▼           ▼
     Portfolio     Briefing     Advisor
     Analysis      (LLM)       Agent
     (no LLM)     live doc     (LLM + tools)
          │           │           │
          ▼           ▼           ▼
  ┌───────────┬───────────┬───────────┐
  │  Briefing │   Feed    │  Advisor  │
  └───────────┴─────┬─────┴───────────┘
                    │
                    ▼
            Smart Actions (LLM)
            → cancellation notice
            → negotiation brief
            → risk summary
            (always human-reviewed)
```

**Key design decisions:**

- **Single-pass extraction** — one LLM call for metadata + risk + confidence. In production, a validation round would catch edge cases.
- **Briefing is a live document** — regenerates when contracts are uploaded, actions are taken, or data changes. Always reflects the current state of the portfolio.
- **Portfolio analysis is deterministic** — no LLM. Fast, reproducible, explainable.
- **Advisor queries structured data, not PDFs** — answers are only as good as the extraction, which is why the confidence model matters.

**What would be different in production:**

| Area            | Prototype            | Production                          |
| --------------- | -------------------- | ----------------------------------- |
| LLM provider    | Ollama (cloud)       | Managed API with fallback           |
| Extraction      | Single-pass          | Multi-pass with validation round    |
| PDF handling    | Text layer only      | OCR pipeline for scanned documents  |
| Confidence      | LLM self-assessment  | Calibrated model on labeled data    |
| Failures        | Stored as partial    | Routed to human review queue        |

---

## 5. What We'd Do with More Time

### Phase 2: Smarter actions and deeper integrations

The prototype proves the core thesis — an advisor that tells you what to do and why. Phase 2 shifts focus from *surfacing* the right information to *acting on it* with less friction.

**Smarter Smart Actions.** The current one-click drafts (cancellation notices, risk summaries) are a starting point. Next: multi-step workflows — a cancellation action that checks cross-dependencies ("this vendor also supplies your SSO provider"), suggests timing based on billing cycles, and tracks follow-through. Actions should learn from edits: if legal always rewrites the liability paragraph, the next draft should reflect that.

**Platform integrations.** Contracts don't live in isolation — the people acting on them work in CRMs, procurement platforms, and communication tools. Key integrations:

- **CRM (Salesforce, HubSpot)** — link contracts to vendor/customer records, surface renewal alerts where relationship managers already work
- **Procurement (Coupa, SAP Ariba)** — sync contract terms with purchase orders, flag spend against contractual limits
- **Communication (Slack, Teams)** — push urgent briefing items and deadline reminders to channels, allow quick actions (flag, approve) without opening the app

**UX polish and deeper insights.** The briefing narrative and feed work — but there's room to make them sharper:

- Trend analysis over time: are risk scores improving? Is vendor concentration growing?
- Comparative benchmarking: how do your terms compare to industry norms?
- Personalized briefings: surface what matters to *you* based on role and past behavior, not just urgency
- Mobile-first experience for executives who check in briefly between meetings

**Confidence model maturation.** Move from LLM self-assessed confidence to a calibrated model trained on user corrections. Every "needs-review" confirmation becomes training data — the system gets more accurate and requires less human review over time.
