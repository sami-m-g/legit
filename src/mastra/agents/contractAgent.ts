import { Agent } from "@mastra/core/agent";
import { LibSQLStore } from "@mastra/libsql";
import { Memory } from "@mastra/memory";
import { z } from "zod";
import { env } from "@/lib/env";
import {
  getContractDetails,
  queryContracts,
  searchContracts,
} from "@/mastra/tools/contracts";

export const AgentState = z.object({
  lastSearchResults: z.array(z.string()).default([]),
  currentContractId: z.string().nullable().default(null),
});

export const contractAgent = new Agent({
  id: "contract-agent",
  name: "Contract Intelligence Agent",
  tools: { searchContracts, getContractDetails, queryContracts },
  model: env.ollama_model,
  instructions: `You are a contract intelligence assistant for an enterprise organization.
You help users understand their contract portfolio by searching contracts,
analyzing terms, and answering questions about obligations, deadlines, and risks.

Available tools:
- searchContracts: Search contracts by keywords or topics
- getContractDetails: Get full details of a specific contract by ID
- queryContracts: Filter contracts by structured criteria (dates, values, types)

When answering:
- Cite specific contracts by name
- Note confidence levels when information may be uncertain
- If you can't find an answer, say so rather than guessing
- Summarize findings concisely but completely`,
  memory: new Memory({
    storage: new LibSQLStore({
      id: "contract-agent-memory",
      url: "file::memory:",
    }),
    options: {
      workingMemory: { enabled: true, schema: AgentState },
    },
  }),
});
