import { getCrossVendorContext } from "@/lib/cross-vendor";
import { initializeDatabase, sql } from "@/lib/db";
import { getPortfolioRows } from "@/lib/portfolio-analysis";
import type { ActionStatus, BriefingActionType } from "@/lib/types";
import { extractionAgent } from "@/mastra/agents/extractionAgent";

const STATUS_MAP: Record<BriefingActionType, ActionStatus> = {
  cancel: "cancelled",
  renew: "reviewed",
  flag: "flagged",
  review: "reviewed",
  activate: "active",
  verify: "reviewed",
};

const DRAFT_ACTIONS = new Set<BriefingActionType>(["cancel", "renew", "flag"]);

function buildPrompt(
  action: BriefingActionType,
  contract: Record<string, unknown>,
): string {
  if (action === "cancel") {
    return `Write a professional cancellation notice letter for this contract.
Be concise and formal. Use "[DATE]" placeholder for the effective cancellation date.

IMPORTANT: Begin the notice with a brief explanation (2-3 sentences) of why cancellation is recommended, based on the risk factors below.

Contract: ${contract.title}
Vendor parties: ${JSON.stringify(contract.parties)}
Expiration/Renewal Date: ${contract.expiration_date ?? contract.renewal_date ?? "Unknown"}
Notice Period: ${JSON.stringify(contract.termination_clauses)}
Risk Score: ${contract.risk_score ?? "unknown"}
Risk Flags: ${JSON.stringify(contract.risk_flags ?? [])}

Return ONLY the letter text, no JSON, no markdown headers.`;
  }
  if (action === "flag") {
    return `Write a concise risk summary for legal review of this contract.
Structure it as:
1. Overview (1-2 sentences on what the contract is)
2. Key Risk Areas (bullet each risk flag with severity and plain-English impact)
3. Recommended Actions (2-3 specific next steps for the legal team)

Contract: ${contract.title}
Parties: ${JSON.stringify(contract.parties)}
Total Value: $${contract.total_value ?? "Unknown"}, Liability Cap: $${contract.liability_cap ?? "Unknown"}
Risk Score: ${contract.risk_score ?? "unknown"}
Risk Flags: ${JSON.stringify(contract.risk_flags ?? [])}
Key Obligations: ${JSON.stringify(contract.key_obligations ?? [])}

Return ONLY the summary text, no JSON, no markdown headers.`;
  }
  return `Write a 1-page negotiation/renewal strategy brief for this contract.
Include: current terms summary, what to push for, and why we have leverage.
Structure with clear sections.

Contract: ${contract.title}
Current Value: $${contract.total_value}, Liability Cap: $${contract.liability_cap}
Negotiation Points: ${JSON.stringify(contract.negotiation_points)}
Key Obligations: ${JSON.stringify(contract.key_obligations)}

Return ONLY the brief text.`;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await initializeDatabase();
    const { id } = await params;
    const { action }: { action: BriefingActionType } = await req.json();

    const newStatus = STATUS_MAP[action];
    if (!newStatus) {
      return Response.json({ error: "Invalid action" }, { status: 400 });
    }

    // Update status
    await sql`
      UPDATE contracts
      SET action_status = ${newStatus}, snoozed_until = NULL, updated_at = NOW()
      WHERE id = ${id}
    `;

    // For cancel/renew, also generate a draft and fetch cross-vendor context
    if (DRAFT_ACTIONS.has(action)) {
      const [contractResult, portfolioRows] = await Promise.all([
        sql`
          SELECT title, parties, expiration_date, renewal_date,
                 termination_clauses, total_value, liability_cap,
                 key_obligations, negotiation_points,
                 risk_score, risk_flags
          FROM contracts WHERE id = ${id}
        `,
        getPortfolioRows(),
      ]);

      if (!contractResult.rows[0]) {
        return Response.json({ error: "Not found" }, { status: 404 });
      }

      const crossVendorContext = getCrossVendorContext(id, portfolioRows);
      const draftResponse = await extractionAgent.generate([
        {
          role: "user",
          content: buildPrompt(action, contractResult.rows[0]),
        },
      ]);

      return Response.json({
        success: true,
        status: newStatus,
        draft: draftResponse.text,
        crossVendorContext,
      });
    }

    return Response.json({ success: true, status: newStatus });
  } catch (error) {
    console.error("Execute action error:", error);
    return Response.json(
      { error: "Failed to execute action" },
      { status: 500 },
    );
  }
}
