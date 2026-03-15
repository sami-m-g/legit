import stringSimilarity from "string-similarity";
import type { CrossVendorContext, PortfolioContractRow } from "./types";
import { getVendorName, SIMILARITY_THRESHOLD } from "./vendor-utils";

export function getCrossVendorContext(
  contractId: string,
  contracts: PortfolioContractRow[],
): CrossVendorContext {
  const target = contracts.find((c) => c.id === contractId);
  if (!target) return { sameVendor: [], sameCategory: [], insight: null };

  const targetVendor = getVendorName(target);
  const others = contracts.filter((c) => c.id !== contractId);

  // Find same-vendor contracts (fuzzy match)
  const sameVendor: CrossVendorContext["sameVendor"] = [];
  if (targetVendor) {
    for (const c of others) {
      const vendor = getVendorName(c);
      if (!vendor) continue;
      const score = stringSimilarity.compareTwoStrings(
        targetVendor.toLowerCase(),
        vendor.toLowerCase(),
      );
      if (score >= SIMILARITY_THRESHOLD) {
        sameVendor.push({
          id: c.id,
          title: c.title ?? "Untitled",
          value: c.total_value,
        });
      }
    }
  }

  // Find same-category contracts
  const sameCategory: CrossVendorContext["sameCategory"] = [];
  if (target.contract_type) {
    for (const c of others) {
      if (c.contract_type === target.contract_type) {
        const vendor = getVendorName(c);
        sameCategory.push({
          id: c.id,
          title: c.title ?? "Untitled",
          vendor: vendor ?? "Unknown",
          value: c.total_value,
        });
      }
    }
  }

  // Generate insight
  let insight: string | null = null;
  if (sameCategory.length > 0 && target.total_value) {
    const categoryValues = sameCategory
      .map((c) => c.value)
      .filter((v): v is number => v != null);
    if (categoryValues.length > 0) {
      const avgValue =
        categoryValues.reduce((sum, v) => sum + v, 0) / categoryValues.length;
      if (target.total_value > avgValue * 1.5) {
        const ratio = (target.total_value / avgValue).toFixed(1);
        const cheapest = sameCategory.reduce(
          (min, c) =>
            c.value != null && (min.value == null || c.value < min.value)
              ? c
              : min,
          sameCategory[0],
        );
        insight = `You pay ${ratio}x more than ${cheapest.vendor} for similar ${target.contract_type} services`;
      }
    }
  }

  return { sameVendor, sameCategory, insight };
}
