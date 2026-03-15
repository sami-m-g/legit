import type { ContractRow } from "@/lib/briefing-rules";
import { classifyContract } from "@/lib/briefing-rules";
import { sql } from "@/lib/db";
import type { BriefingItem, ContractSummary } from "@/lib/types";

export async function getActiveContractSummaries(): Promise<ContractSummary[]> {
  const result = await sql`
    SELECT id, filename, title, contract_type, status, upload_date,
           expiration_date, renewal_date, auto_renewal, action_status,
           parties
    FROM contracts
    WHERE action_status != 'cancelled'
    ORDER BY upload_date DESC
    LIMIT 100
  `;
  return result.rows as ContractSummary[];
}

export async function getBriefingItems(): Promise<BriefingItem[]> {
  const today = new Date();

  const result = await sql`
    SELECT id, title, filename, contract_type, auto_renewal,
           expiration_date, renewal_date, liability_cap,
           extraction_confidence, action_status
    FROM contracts
    WHERE action_status != 'cancelled'
    ORDER BY expiration_date ASC NULLS LAST
  `;

  const items: BriefingItem[] = [];

  for (const row of result.rows) {
    const item = classifyContract(row as ContractRow, today);
    if (item) items.push(item);
  }

  // Sort: urgent first, then watch, then info
  const urgencyOrder = { urgent: 0, watch: 1, info: 2 };
  items.sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency]);

  return items;
}
