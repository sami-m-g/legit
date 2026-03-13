import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
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
