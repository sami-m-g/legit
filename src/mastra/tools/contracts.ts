import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { sql } from "@/lib/db";

export const searchContracts = createTool({
  id: "searchContracts",
  description:
    "Search contracts by keywords or topics. Use this when the user asks about contracts related to a specific subject, vendor, or topic.",
  inputSchema: z.object({
    query: z.string().describe("Keywords or topic to search for in contracts"),
  }),
  outputSchema: z.object({
    contracts: z.array(
      z.object({
        id: z.string(),
        filename: z.string(),
        title: z.string().nullable(),
        contract_type: z.string().nullable(),
        status: z.string(),
        summary: z.string().nullable(),
        snippet: z.string().nullable(),
      }),
    ),
  }),
  execute: async ({ query }) => {
    const result = await sql`
      SELECT id, filename, title, contract_type, status, summary,
        CASE WHEN raw_text ILIKE ${`%${query}%`}
          THEN substring(raw_text from position(lower(${query}) in lower(raw_text)) - 50 for 200)
          ELSE NULL
        END as snippet
      FROM contracts
      WHERE title ILIKE ${`%${query}%`}
         OR summary ILIKE ${`%${query}%`}
         OR raw_text ILIKE ${`%${query}%`}
      ORDER BY upload_date DESC
      LIMIT 10
    `;
    return { contracts: result.rows as typeof result.rows };
  },
});

export const getContractDetails = createTool({
  id: "getContractDetails",
  description:
    "Get full details of a specific contract by its ID. Use this when the user asks for details about a specific contract.",
  inputSchema: z.object({
    contractId: z.uuid().describe("The UUID of the contract to retrieve"),
  }),
  outputSchema: z.object({
    contract: z.record(z.string(), z.unknown()).nullable(),
  }),
  execute: async ({ contractId }) => {
    const result = await sql`
      SELECT id, filename, title, contract_type, status, upload_date,
             effective_date, expiration_date, auto_renewal, total_value,
             liability_cap, summary, parties, key_obligations,
             termination_clauses, extraction_confidence, page_count
      FROM contracts WHERE id = ${contractId}
    `;
    return { contract: result.rows[0] ?? null };
  },
});

export const queryContracts = createTool({
  id: "queryContracts",
  description:
    "Filter contracts by structured criteria. Use this for questions like: 'expiring in 90 days', 'auto-renewal contracts', 'liability cap below $1M', 'contracts over $100K', 'NDAs', 'expired contracts'.",
  inputSchema: z.object({
    filter: z
      .string()
      .describe(
        "Natural language filter criteria such as 'expiring in 90 days', 'auto-renewal', 'NDA', 'value over 100000'",
      ),
  }),
  outputSchema: z.object({
    contracts: z.array(z.record(z.string(), z.unknown())),
    filterApplied: z.string(),
  }),
  execute: async ({ filter }) => {
    const lower = filter.toLowerCase();

    let result: { rows: Record<string, unknown>[] };
    let filterApplied: string;

    if (lower.includes("expired")) {
      result = await sql`
        SELECT id, filename, title, contract_type, status, expiration_date
        FROM contracts WHERE expiration_date < NOW() ORDER BY expiration_date DESC
      `;
      filterApplied = "Expired contracts";
    } else if (lower.includes("expir")) {
      const dayMatch = filter.match(/\d+/);
      const days = dayMatch ? Number.parseInt(dayMatch[0], 10) : 90;
      result = await sql`
        SELECT id, filename, title, contract_type, status, expiration_date, parties
        FROM contracts
        WHERE expiration_date BETWEEN NOW() AND NOW() + (${days} || ' days')::INTERVAL
        ORDER BY expiration_date ASC
      `;
      filterApplied = `Expiring within ${days} days`;
    } else if (
      lower.includes("auto-renewal") ||
      lower.includes("auto renewal") ||
      lower.includes("renewal")
    ) {
      result = await sql`
        SELECT id, filename, title, contract_type, status, expiration_date, auto_renewal
        FROM contracts WHERE auto_renewal = true ORDER BY expiration_date ASC
      `;
      filterApplied = "Auto-renewal contracts";
    } else if (lower.includes("liability") || lower.includes("cap")) {
      const match = filter.match(/[\d,]+/);
      const cap = match
        ? Number.parseInt(match[0].replace(",", ""), 10)
        : 1000000;
      result = await sql`
        SELECT id, filename, title, contract_type, status, liability_cap
        FROM contracts WHERE liability_cap IS NOT NULL AND liability_cap < ${cap}
        ORDER BY liability_cap ASC
      `;
      filterApplied = `Liability cap below $${cap.toLocaleString()}`;
    } else if (
      lower.includes("value") ||
      lower.includes("worth") ||
      lower.includes("$")
    ) {
      const match = filter.match(/[\d,]+/);
      const val = match
        ? Number.parseInt(match[0].replace(",", ""), 10)
        : 100000;
      result = await sql`
        SELECT id, filename, title, contract_type, status, total_value
        FROM contracts WHERE total_value IS NOT NULL AND total_value > ${val}
        ORDER BY total_value DESC
      `;
      filterApplied = `Total value over $${val.toLocaleString()}`;
    } else if (lower.includes("nda")) {
      result = await sql`
        SELECT id, filename, title, contract_type, status, upload_date
        FROM contracts WHERE contract_type ILIKE '%nda%' OR title ILIKE '%nda%'
        ORDER BY upload_date DESC
      `;
      filterApplied = "NDA contracts";
    } else {
      // Generic: search by contract_type or return all
      result = await sql`
        SELECT id, filename, title, contract_type, status, upload_date, expiration_date
        FROM contracts
        WHERE contract_type ILIKE ${`%${filter}%`} OR title ILIKE ${`%${filter}%`}
        ORDER BY upload_date DESC LIMIT 20
      `;
      filterApplied = `Matched filter: ${filter}`;
    }

    return { contracts: result.rows, filterApplied };
  },
});
