import type {
  BriefingItem,
  PortfolioContractRow,
  PortfolioIntelligence,
} from "./types";

/**
 * Converts flagged portfolio intelligence detectors into actionable briefing items.
 * Each flagged detector produces one briefing item with source: "portfolio".
 */
export function portfolioToBriefingItems(
  intelligence: PortfolioIntelligence,
  contracts: PortfolioContractRow[],
): BriefingItem[] {
  const items: BriefingItem[] = [];

  const {
    vendorDependency,
    termsInconsistency,
    liabilityOutlier,
    riskHotspot,
  } = intelligence;

  if (vendorDependency.flagged && vendorDependency.vendor) {
    const relatedIds = contracts
      .filter((c) => c.parties?.some((p) => p.name === vendorDependency.vendor))
      .map((c) => c.id);
    items.push({
      contractId: "portfolio:vendor-dependency",
      title: `Vendor Concentration: ${vendorDependency.vendor}`,
      urgency: "watch",
      reason: `${vendorDependency.percentage}% of spend concentrated with ${vendorDependency.vendor} (${vendorDependency.contractCount} contract${vendorDependency.contractCount === 1 ? "" : "s"})`,
      recommendation:
        "Consider diversifying vendor relationships to reduce dependency risk.",
      primaryAction: { label: "Review Contracts", status: "flagged" },
      source: "portfolio",
      relatedContractIds: relatedIds,
    });
  }

  if (termsInconsistency.flagged && termsInconsistency.range) {
    const label =
      termsInconsistency.metric === "liability_cap"
        ? "liability caps"
        : "contract values";
    const { min, max } = termsInconsistency.range;
    items.push({
      contractId: "portfolio:terms-inconsistency",
      title: `Inconsistent ${termsInconsistency.type} Terms`,
      urgency: "watch",
      reason: `${termsInconsistency.type} ${label} vary ${Math.round(max / min)}x ($${min.toLocaleString()}\u2013$${max.toLocaleString()})`,
      recommendation:
        "Standardize terms across similar contract types to reduce risk exposure.",
      primaryAction: { label: "Review Terms", status: "flagged" },
      source: "portfolio",
    });
  }

  if (liabilityOutlier.flagged && liabilityOutlier.contractId) {
    items.push({
      contractId: "portfolio:liability-outlier",
      title: `Liability Outlier: ${liabilityOutlier.contractTitle ?? "Unknown"}`,
      urgency: "urgent",
      reason: `Liability cap ($${liabilityOutlier.cap?.toLocaleString()}) is ${liabilityOutlier.deviationPct}% below peer average ($${liabilityOutlier.peerAvg?.toLocaleString()})`,
      recommendation:
        "Renegotiate liability terms to align with portfolio standards.",
      primaryAction: {
        label: "Flag for Review",
        status: "flagged",
        actionType: "flag",
      },
      source: "portfolio",
      relatedContractIds: [liabilityOutlier.contractId],
    });
  }

  if (riskHotspot.flagged && riskHotspot.category) {
    items.push({
      contractId: "portfolio:risk-hotspot",
      title: `Risk Hotspot: ${riskHotspot.category}`,
      urgency: "watch",
      reason: `${riskHotspot.category} contracts show elevated risk (${riskHotspot.categoryAvgRisk?.toFixed(1)}) vs portfolio average (${riskHotspot.portfolioAvgRisk?.toFixed(1)})`,
      recommendation:
        "Review high-risk contracts in this category for common issues.",
      primaryAction: { label: "Review Category", status: "flagged" },
      source: "portfolio",
    });
  }

  return items;
}
