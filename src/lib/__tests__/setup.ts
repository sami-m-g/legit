// Test environment setup — runs before any test file imports
process.env.BLOB_READ_WRITE_TOKEN = "test-blob-token";
process.env.POSTGRES_URL = "postgres://test:test@localhost/test";

import { mock } from "bun:test";

// Mock the extraction agent so it uses globalThis.fetch directly.
// This lets individual tests control the response via globalThis.fetch mocks,
// using the same pattern as the rest of the test suite.
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
      // Extract JSON from the response (may be surrounded by prose)
      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("No JSON in response");
      const parsed = JSON.parse(match[0]);
      return { object: parsed };
    },
  },
}));
