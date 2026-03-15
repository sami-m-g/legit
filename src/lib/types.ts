export type ActionStatus = "active" | "flagged" | "cancelled" | "reviewed";

export type CrossVendorContext = {
  sameVendor: Array<{ id: string; title: string; value: number | null }>;
  sameCategory: Array<{
    id: string;
    title: string;
    vendor: string;
    value: number | null;
  }>;
  insight: string | null;
};

export type ConfidenceStatus = "verified" | "needs-review";

export type RiskScore = "low" | "medium" | "high" | "critical" | "unknown";

export type ActionType =
  | "cancellation-notice"
  | "negotiation-brief"
  | "risk-summary";

export type BriefingActionType =
  | "cancel"
  | "renew"
  | "flag"
  | "review"
  | "activate"
  | "verify";

export type BriefingItem = {
  contractId: string;
  title: string;
  urgency: "urgent" | "watch" | "info";
  reason: string;
  recommendation?: string;
  primaryAction: {
    label: string;
    status: ActionStatus;
    actionType?: BriefingActionType;
  };
  secondaryAction?: {
    label: string;
    status: ActionStatus;
    actionType?: BriefingActionType;
  };
  source?: "contract" | "portfolio";
  relatedContractIds?: string[];
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
  parties: Array<{ name: string; role: string }> | null;
};

export type RiskFlag = {
  clause: string;
  quote: string;
  risk: string;
  explanation: string;
  severity: "critical" | "high" | "medium" | "low";
};

export type NegotiationPoint = {
  point: string;
  leverage: string;
  recommendation: string;
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
  risk_score: RiskScore | null;
  risk_flags: RiskFlag[] | null;
  negotiation_points: NegotiationPoint[] | null;
};

export type VendorDependencyResult = {
  flagged: boolean;
  vendor?: string;
  percentage?: number;
  value?: number;
  contractCount?: number;
};

export type TermsInconsistencyResult = {
  flagged: boolean;
  type?: string;
  metric?: "liability_cap" | "value";
  range?: { min: number; max: number };
};

export type LiabilityOutlierResult = {
  flagged: boolean;
  contractTitle?: string;
  contractId?: string;
  cap?: number;
  peerAvg?: number;
  deviationPct?: number;
};

export type RiskHotspotResult = {
  flagged: boolean;
  category?: string;
  categoryAvgRisk?: number;
  portfolioAvgRisk?: number;
};

export type PortfolioIntelligence = {
  vendorDependency: VendorDependencyResult;
  termsInconsistency: TermsInconsistencyResult;
  liabilityOutlier: LiabilityOutlierResult;
  riskHotspot: RiskHotspotResult;
};

export type PortfolioContractRow = {
  id: string;
  title: string | null;
  contract_type: string | null;
  parties: Array<{ name: string; role: string }> | null;
  total_value: number | null;
  liability_cap: number | null;
  risk_score: string | null;
};
