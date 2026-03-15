import { initializeDatabase, sql } from "@/lib/db";
import type { ActionType } from "@/lib/types";
import { extractionAgent } from "@/mastra/agents/extractionAgent";

const PROMPTS: Record<ActionType, (c: Record<string, unknown>) => string> = {
  "cancellation-notice": (
    c,
  ) => `Write a professional cancellation notice letter for this contract.
Be concise and formal. Use "[DATE]" placeholder for the effective cancellation date.

Contract: ${c.title}
Vendor parties: ${JSON.stringify(c.parties)}
Expiration/Renewal Date: ${c.expiration_date ?? c.renewal_date ?? "Unknown"}
Notice Period: ${JSON.stringify(c.termination_clauses)}

Return ONLY the letter text, no JSON, no markdown headers.`,

  "negotiation-brief": (
    c,
  ) => `Write a 1-page negotiation brief for renewing or renegotiating this contract.
Include: current terms summary, what to push for, and why we have leverage.
Structure with clear sections.

Contract: ${c.title}
Current Value: $${c.total_value}, Liability Cap: $${c.liability_cap}
Negotiation Points: ${JSON.stringify(c.negotiation_points)}
Key Obligations: ${JSON.stringify(c.key_obligations)}

Return ONLY the brief text.`,

  "risk-summary": (
    c,
  ) => `Write a short risk summary for this contract, suitable for sharing with a legal team.
Plain English, non-technical. Highlight the most important risks.

Contract: ${c.title}
Risk Score: ${c.risk_score}
Risk Flags: ${JSON.stringify(c.risk_flags)}

Return ONLY the summary text.`,
};

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  await initializeDatabase();
  const { id } = await params;
  const { action_type }: { action_type: ActionType } = await req.json();

  const result = await sql`
    SELECT title, parties, expiration_date, renewal_date,
           termination_clauses, total_value, liability_cap,
           key_obligations, negotiation_points, risk_score, risk_flags
    FROM contracts WHERE id = ${id}
  `;
  if (!result.rows[0]) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const promptFn = PROMPTS[action_type];
  if (!promptFn) {
    return Response.json({ error: "Unknown action type" }, { status: 400 });
  }

  const response = await extractionAgent.generate([
    { role: "user", content: promptFn(result.rows[0]) },
  ]);

  return Response.json({ draft: response.text, action_type });
}
