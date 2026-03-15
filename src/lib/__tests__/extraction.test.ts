import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";

// Mock the extraction agent so tests control responses via globalThis.fetch
mock.module("@/mastra/agents/extractionAgent", () => ({
  extractionAgent: {
    generate: async (messages: Array<{ role: string; content: string }>) => {
      const res = await fetch("http://localhost:11434/api/generate", {
        method: "POST",
        body: JSON.stringify({ prompt: messages[0]?.content ?? "" }),
      });
      if (!res.ok) throw new Error(`Ollama error: ${res.status}`);
      const json = await res.json();
      const raw: string = json.response ?? "";
      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("No JSON in response");
      const parsed = JSON.parse(match[0]);
      return { object: parsed };
    },
  },
}));

import { extractContractData } from "@/lib/extraction";

const VALID_RESPONSE = {
  title: "Test SaaS Agreement",
  contract_type: "SaaS",
  parties: [{ name: "Acme Corp", role: "Vendor" }],
  effective_date: "2025-01-01",
  expiration_date: "2026-01-01",
  auto_renewal: true,
  total_value: 84000,
  liability_cap: 84000,
  summary: "Annual SaaS subscription.",
  key_obligations: [
    { description: "Pay fees", party: "Customer", deadline: "2025-01-01" },
  ],
  termination_clauses: [
    { description: "30 days notice", notice_period: "30 days" },
  ],
  confidence: 0.92,
};

const RISK_RESPONSE = {
  ...VALID_RESPONSE,
  risk_score: "high",
  risk_flags: [
    {
      clause: "Liability",
      quote: "Vendor shall not be liable for any damages whatsoever",
      risk: "Uncapped liability waiver",
      explanation: "Company has no recourse for damages",
      severity: "critical",
    },
  ],
  negotiation_points: [
    {
      point: "Liability cap",
      leverage: "Industry standard requires mutual caps",
      recommendation: "Negotiate a mutual liability cap equal to fees paid",
    },
  ],
};

describe("extractContractData", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    // Reset to real fetch before each test to avoid contamination
    globalThis.fetch = originalFetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("parses a valid JSON response from Ollama", async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({ response: JSON.stringify(VALID_RESPONSE) }),
          { status: 200 },
        ),
      ),
    ) as unknown as typeof fetch;

    const result = await extractContractData("contract text here");

    expect(result.title).toBe("Test SaaS Agreement");
    expect(result.contract_type).toBe("SaaS");
    expect(result.total_value).toBe(84000);
    expect(result.confidence).toBe(0.92);
    expect(result.auto_renewal).toBe(true);
    expect(result.parties).toHaveLength(1);
  });

  it("returns fallback struct when Ollama returns non-OK response", async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve(new Response("", { status: 500 })),
    ) as unknown as typeof fetch;

    const result = await extractContractData("contract text here");

    expect(result.title).toBeNull();
    expect(result.contract_type).toBeNull();
    expect(result.confidence).toBe(0);
    expect(result.parties).toBeNull();
  });

  it("returns fallback struct when Ollama returns invalid JSON in response field", async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve(
        new Response(JSON.stringify({ response: "This is not JSON at all" }), {
          status: 200,
        }),
      ),
    ) as unknown as typeof fetch;

    const result = await extractContractData("contract text here");

    expect(result.title).toBeNull();
    expect(result.confidence).toBe(0);
  });

  it("extracts JSON even when surrounded by extra text", async () => {
    const wrappedJson = `Here is the extracted data:\n${JSON.stringify(VALID_RESPONSE)}\nEnd of response.`;
    globalThis.fetch = mock(() =>
      Promise.resolve(
        new Response(JSON.stringify({ response: wrappedJson }), {
          status: 200,
        }),
      ),
    ) as unknown as typeof fetch;

    const result = await extractContractData("contract text here");

    expect(result.title).toBe("Test SaaS Agreement");
    expect(result.confidence).toBe(0.92);
  });
});

describe("extractContractData — risk fields", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = originalFetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("returns risk_score, risk_flags, and negotiation_points when LLM returns those fields", async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({ response: JSON.stringify(RISK_RESPONSE) }),
          { status: 200 },
        ),
      ),
    ) as unknown as typeof fetch;

    const result = await extractContractData("contract text here");

    expect(result.risk_score).toBe("high");
    expect(result.risk_flags).toHaveLength(1);
    expect(result.risk_flags[0].severity).toBe("critical");
    expect(result.negotiation_points).toHaveLength(1);
  });

  it("returns empty risk_flags, negotiation_points, and risk_score unknown when extraction fails", async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve(new Response("", { status: 500 })),
    ) as unknown as typeof fetch;

    const result = await extractContractData("contract text here");

    expect(result.risk_score).toBe("unknown");
    expect(result.risk_flags).toEqual([]);
    expect(result.negotiation_points).toEqual([]);
  });
});
