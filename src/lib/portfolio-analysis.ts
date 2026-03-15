import stringSimilarity from "string-comparison";
import { sql } from "./db";
import type {
  LiabilityOutlierResult,
  PortfolioContractRow,
  PortfolioIntelligence,
  RiskHotspotResult,
  TermsInconsistencyResult,
  VendorDependencyResult,
} from "./types";
import { getVendorName, SIMILARITY_THRESHOLD } from "./vendor-utils";

/** Postgres NUMERIC columns come back as strings — coerce to number | null. */
function num(v: unknown): number | null {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Ensure numeric fields are actual numbers (Postgres NUMERIC → string). */
export function parsePortfolioRows(
  rows: PortfolioContractRow[],
): PortfolioContractRow[] {
  return rows.map((r) => ({
    ...r,
    total_value: num(r.total_value),
    liability_cap: num(r.liability_cap),
  }));
}

/** Fetches all non-cancelled contracts with portfolio-relevant columns. */
export async function getPortfolioRows(): Promise<PortfolioContractRow[]> {
  const result = await sql`
    SELECT id, title, contract_type, parties, total_value, liability_cap, risk_score
    FROM contracts
    WHERE action_status != 'cancelled'
  `;
  return parsePortfolioRows(result.rows as PortfolioContractRow[]);
}

const VENDOR_CONCENTRATION_PCT = 30;
const TERMS_RANGE_RATIO = 3;
const RISK_HOTSPOT_DEVIATION = 0.5; // 50% above portfolio avg

const RISK_SCORE_MAP: Record<string, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
  unknown: 0,
};

function groupByVendor(
  contracts: PortfolioContractRow[],
): Record<string, PortfolioContractRow[]> {
  const groups: Record<string, PortfolioContractRow[]> = {};
  for (const contract of contracts) {
    const vendor = getVendorName(contract);
    if (!vendor) continue;
    const existing = Object.keys(groups);
    if (existing.length === 0) {
      groups[vendor] = [contract];
      continue;
    }
    const matches = stringSimilarity.diceCoefficient.sortMatch(vendor, existing);
    const bestMatch = matches[matches.length - 1];
    if (bestMatch.rating >= SIMILARITY_THRESHOLD) {
      groups[bestMatch.member].push(contract);
    } else {
      groups[vendor] = [contract];
    }
  }
  return groups;
}

function groupByType(
  contracts: PortfolioContractRow[],
): Record<string, PortfolioContractRow[]> {
  const groups: Record<string, PortfolioContractRow[]> = {};
  for (const c of contracts) {
    const key = c.contract_type ?? "other";
    if (!groups[key]) groups[key] = [];
    groups[key].push(c);
  }
  return groups;
}

export function detectVendorDependency(
  contracts: PortfolioContractRow[],
): VendorDependencyResult {
  const totalValue = contracts.reduce(
    (sum, c) => sum + (c.total_value ?? 0),
    0,
  );
  if (totalValue === 0) return { flagged: false };

  const vendorGroups = groupByVendor(contracts);
  let maxVendor = "";
  let maxValue = 0;
  let maxCount = 0;

  for (const [vendor, group] of Object.entries(vendorGroups)) {
    const vendorValue = group.reduce((sum, c) => sum + (c.total_value ?? 0), 0);
    if (vendorValue > maxValue) {
      maxVendor = vendor;
      maxValue = vendorValue;
      maxCount = group.length;
    }
  }

  const pct = Math.round((maxValue / totalValue) * 100);
  if (pct >= VENDOR_CONCENTRATION_PCT) {
    return {
      flagged: true,
      vendor: maxVendor,
      percentage: pct,
      value: maxValue,
      contractCount: maxCount,
    };
  }
  return { flagged: false };
}

export function detectTermsInconsistency(
  contracts: PortfolioContractRow[],
): TermsInconsistencyResult {
  const byType = groupByType(contracts);

  for (const [type, group] of Object.entries(byType)) {
    if (!group || group.length < 2) continue;

    // Check liability_cap inconsistency
    const caps = group
      .map((c) => c.liability_cap)
      .filter((v): v is number => v != null && v > 0);
    if (caps.length >= 2) {
      const min = Math.min(...caps);
      const max = Math.max(...caps);
      if (max / min >= TERMS_RANGE_RATIO) {
        return {
          flagged: true,
          type,
          metric: "liability_cap",
          range: { min, max },
        };
      }
    }

    // Check value inconsistency
    const values = group
      .map((c) => c.total_value)
      .filter((v): v is number => v != null && v > 0);
    if (values.length >= 2) {
      const min = Math.min(...values);
      const max = Math.max(...values);
      if (max / min >= TERMS_RANGE_RATIO) {
        return {
          flagged: true,
          type,
          metric: "value",
          range: { min, max },
        };
      }
    }
  }

  return { flagged: false };
}

export function detectLiabilityOutlier(
  contracts: PortfolioContractRow[],
): LiabilityOutlierResult {
  const byType = groupByType(contracts);
  let worstDeviation = 0;
  let worstResult: LiabilityOutlierResult = { flagged: false };

  for (const [, group] of Object.entries(byType)) {
    if (!group) continue;
    const withCaps = group.filter(
      (c) => c.liability_cap != null && c.liability_cap > 0,
    );
    if (withCaps.length < 2) continue;

    const avg =
      withCaps.reduce((sum, c) => sum + (c.liability_cap as number), 0) /
      withCaps.length;

    for (const c of withCaps) {
      const cap = c.liability_cap as number;
      const deviation = (avg - cap) / avg;
      if (deviation > worstDeviation) {
        worstDeviation = deviation;
        worstResult = {
          flagged: true,
          contractTitle: c.title ?? undefined,
          contractId: c.id,
          cap,
          peerAvg: Math.round(avg),
          deviationPct: Math.round(deviation * 100),
        };
      }
    }
  }

  // Only flag if deviation is meaningful (>30%)
  if (worstDeviation < 0.3) return { flagged: false };
  return worstResult;
}

export function detectRiskHotspot(
  contracts: PortfolioContractRow[],
): RiskHotspotResult {
  const scored = contracts.filter(
    (c) => c.risk_score != null && c.risk_score !== "unknown",
  );
  if (scored.length === 0) return { flagged: false };

  const portfolioAvg =
    scored.reduce(
      (sum, c) => sum + (RISK_SCORE_MAP[c.risk_score ?? ""] ?? 0),
      0,
    ) / scored.length;

  const byType = groupByType(scored);
  let worstCategory = "";
  let worstAvg = 0;

  for (const [type, group] of Object.entries(byType)) {
    if (!group || group.length < 2) continue;
    const typeAvg =
      group.reduce(
        (sum, c) => sum + (RISK_SCORE_MAP[c.risk_score ?? ""] ?? 0),
        0,
      ) / group.length;
    if (typeAvg > worstAvg) {
      worstCategory = type;
      worstAvg = typeAvg;
    }
  }

  if (
    worstCategory &&
    portfolioAvg > 0 &&
    worstAvg > portfolioAvg * (1 + RISK_HOTSPOT_DEVIATION)
  ) {
    return {
      flagged: true,
      category: worstCategory,
      categoryAvgRisk: Math.round(worstAvg * 100) / 100,
      portfolioAvgRisk: Math.round(portfolioAvg * 100) / 100,
    };
  }
  return { flagged: false };
}

export function computePortfolioIntelligence(
  contracts: PortfolioContractRow[],
): PortfolioIntelligence {
  return {
    vendorDependency: detectVendorDependency(contracts),
    termsInconsistency: detectTermsInconsistency(contracts),
    liabilityOutlier: detectLiabilityOutlier(contracts),
    riskHotspot: detectRiskHotspot(contracts),
  };
}
