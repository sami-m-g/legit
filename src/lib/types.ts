export type ActionStatus =
  | "active"
  | "flagged"
  | "cancelled"
  | "snoozed"
  | "reviewed";

export type BriefingItem = {
  contractId: string;
  title: string;
  urgency: "urgent" | "watch" | "info";
  reason: string;
  primaryAction: { label: string; status: ActionStatus };
  secondaryAction?: { label: string; status: ActionStatus };
};

// State of the agent, make sure this aligns with your agent's state.
export type AgentState = {
  lastSearchResults: string[];
  currentContractId: string | null;
};

export type ContractSummary = {
  id: string;
  filename: string;
  title: string | null;
  contract_type: string | null;
  status: "processing" | "extracted" | "partial";
  upload_date: string;
  expiration_date: string | null;
  renewal_date: string | null;
  auto_renewal: boolean | null;
  action_status: ActionStatus | null;
  snoozed_until: string | null;
  parties: Array<{ name: string; role: string }> | null;
};

export type ContractDetail = ContractSummary & {
  blob_url: string;
  blob_download_url: string;
  raw_text: string | null;
  page_count: number | null;
  effective_date: string | null;
  total_value: number | null;
  liability_cap: number | null;
  summary: string | null;
  key_obligations: Array<{
    description: string;
    party: string;
    deadline: string;
  }> | null;
  termination_clauses: Array<{
    description: string;
    notice_period: string;
  }> | null;
  extraction_confidence: number | null;
};
