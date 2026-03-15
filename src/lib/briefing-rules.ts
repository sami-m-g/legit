// Pure classification logic — no DB dependency, fully testable.
import type { BriefingItem } from "@/lib/types";
import { daysUntil } from "@/lib/utils";

export const COMPANY_LIABILITY_THRESHOLD = 1_000_000;
export const LOW_CONFIDENCE_THRESHOLD = 0.55;

export type ContractRow = {
  id: string;
  title: string | null;
  filename: string;
  auto_renewal: boolean | null;
  renewal_date: string | null;
  expiration_date: string | null;
  liability_cap: number | null;
  extraction_confidence: number | null;
  action_status: string;
};

export function classifyContract(
  row: ContractRow,
  today: Date = new Date(),
): BriefingItem | null {
  const title = row.title ?? row.filename;
  const renewalDate = row.renewal_date ? new Date(row.renewal_date) : null;
  const expirationDate = row.expiration_date
    ? new Date(row.expiration_date)
    : null;
  const daysToRenewal = renewalDate ? daysUntil(renewalDate, today) : null;
  const daysToExpiry = expirationDate ? daysUntil(expirationDate, today) : null;
  const {
    auto_renewal: autoRenewal,
    liability_cap: liabilityCap,
    extraction_confidence: confidence,
    action_status: actionStatus,
    id,
  } = row;

  // URGENT: auto-renewal closing within 45 days
  if (
    autoRenewal &&
    daysToRenewal !== null &&
    daysToRenewal > 0 &&
    daysToRenewal <= 45
  ) {
    return {
      contractId: id,
      title,
      urgency: "urgent",
      reason: `Auto-renews ${renewalDate?.toLocaleDateString() ?? "soon"}, cancellation window closes in ${daysToRenewal} days`,
      recommendation:
        "Act before the renewal window closes — check the contract's required notice period to cancel in time.",
      primaryAction: {
        label: "Cancel Contract",
        status: "cancelled",
        actionType: "cancel",
      },
      secondaryAction: {
        label: "Flag for Review",
        status: "flagged",
        actionType: "flag",
      },
    };
  }

  // URGENT: expired (past expiration, still active)
  if (daysToExpiry !== null && daysToExpiry < 0 && actionStatus === "active") {
    return {
      contractId: id,
      title,
      urgency: "urgent",
      reason: `Expired ${Math.abs(daysToExpiry)} days ago — may have auto-renewed without approval`,
      recommendation:
        "Determine if this contract auto-renewed without approval. Flag for legal review immediately.",
      primaryAction: {
        label: "Flag for Legal Review",
        status: "flagged",
        actionType: "flag",
      },
      secondaryAction: {
        label: "Mark Reviewed",
        status: "reviewed",
        actionType: "review",
      },
    };
  }

  // URGENT: liability cap below threshold
  if (
    liabilityCap !== null &&
    liabilityCap < COMPANY_LIABILITY_THRESHOLD &&
    actionStatus === "active"
  ) {
    return {
      contractId: id,
      title,
      urgency: "urgent",
      reason: `Liability cap ($${liabilityCap.toLocaleString()}) is below company threshold ($${COMPANY_LIABILITY_THRESHOLD.toLocaleString()})`,
      recommendation:
        "Flag for legal review — your exposure exceeds company risk policy of $1M.",
      primaryAction: {
        label: "Flag for Legal Review",
        status: "flagged",
        actionType: "flag",
      },
    };
  }

  // WATCH: expiring within 90 days (non-auto-renewal)
  if (
    !autoRenewal &&
    daysToExpiry !== null &&
    daysToExpiry > 0 &&
    daysToExpiry <= 90
  ) {
    return {
      contractId: id,
      title,
      urgency: "watch",
      reason: `Expires in ${daysToExpiry} days — renewal decision needed`,
      recommendation:
        "Decide now whether to renew, renegotiate, or let this lapse. Start vendor conversations early.",
      primaryAction: {
        label: "Plan Renewal",
        status: "flagged",
        actionType: "renew",
      },
      secondaryAction: {
        label: "Mark Reviewed",
        status: "reviewed",
        actionType: "review",
      },
    };
  }

  // WATCH: auto-renewal within 90 days (outside urgent window)
  if (
    autoRenewal &&
    daysToRenewal !== null &&
    daysToRenewal > 45 &&
    daysToRenewal <= 90
  ) {
    return {
      contractId: id,
      title,
      urgency: "watch",
      reason: `Auto-renews in ${daysToRenewal} days — renegotiation window is open`,
      recommendation:
        "Mark your calendar — the cancellation window opens soon. Review terms before it closes.",
      primaryAction: {
        label: "Flag for Legal Review",
        status: "flagged",
        actionType: "flag",
      },
      secondaryAction: {
        label: "Flag for Review",
        status: "flagged",
        actionType: "flag",
      },
    };
  }

  // WATCH: low confidence extraction
  if (
    confidence !== null &&
    confidence < LOW_CONFIDENCE_THRESHOLD &&
    actionStatus === "active"
  ) {
    return {
      contractId: id,
      title,
      urgency: "watch",
      reason: "Extraction needs review — some fields may be incorrect",
      recommendation:
        "This contract's data was extracted with low confidence. Verify key dates, values, and terms against the PDF.",
      primaryAction: {
        label: "Verify Manually",
        status: "reviewed",
        actionType: "verify",
      },
    };
  }

  // WATCH: flagged contracts
  if (actionStatus === "flagged") {
    return {
      contractId: id,
      title,
      urgency: "watch",
      reason: "Flagged for legal review",
      recommendation: "This contract is awaiting legal review.",
      primaryAction: { label: "Mark Reviewed", status: "reviewed" },
    };
  }

  // INFO: recently reviewed
  if (actionStatus === "reviewed") {
    return {
      contractId: id,
      title,
      urgency: "info",
      reason: "Recently reviewed and actioned",
      recommendation: "No action needed — this contract was recently reviewed.",
      primaryAction: { label: "Mark Active", status: "active" },
    };
  }

  return null;
}
