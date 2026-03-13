import { Agent } from "@mastra/core/agent";
import { env } from "@/lib/env";

export const extractionAgent = new Agent({
  id: "extraction-agent",
  name: "Extraction Agent",
  instructions: `You are a contract data extraction engine. Extract structured JSON from contract text. Return only the requested fields with high accuracy.`,
  model: env.ollama_model,
});
