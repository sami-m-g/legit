import type { ContractRow } from "@/lib/briefing-rules";
import { classifyContract } from "@/lib/briefing-rules";
import { sql } from "@/lib/db";
import type { BriefingItem } from "@/lib/types";

export type { ContractRow } from "@/lib/briefing-rules";
export { classifyContract } from "@/lib/briefing-rules";

export async function getBriefingItems(): Promise<BriefingItem[]> {
  const today = new Date();

  const result = await sql`
    SELECT id, title, filename, contract_type, auto_renewal,
           expiration_date, renewal_date, liability_cap,
           extraction_confidence, action_status, snoozed_until
    FROM contracts
    WHERE action_status != 'cancelled'
      AND (snoozed_until IS NULL OR snoozed_until < NOW())
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
