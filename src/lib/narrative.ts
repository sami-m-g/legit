import type { BriefingItem, PortfolioIntelligence } from "@/lib/types";
import { extractionAgent } from "@/mastra/agents/extractionAgent";

export type NarrativeBriefing = {
  narrative: string;
  generatedAt: string;
  stats: {
    totalContracts: number;
    urgentCount: number;
    watchCount: number;
    portfolioFlags: number;
  };
};

function countPortfolioFlags(intelligence: PortfolioIntelligence): number {
  let count = 0;
  if (intelligence.vendorDependency.flagged) count++;
  if (intelligence.termsInconsistency.flagged) count++;
  if (intelligence.liabilityOutlier.flagged) count++;
  if (intelligence.riskHotspot.flagged) count++;
  return count;
}

function buildNarrativePrompt(
  items: BriefingItem[],
  intelligence: PortfolioIntelligence,
  contractCount: number,
): string {
  const urgent = items.filter((i) => i.urgency === "urgent");
  const watch = items.filter((i) => i.urgency === "watch");

  const sections: string[] = [];

  sections.push(`Portfolio: ${contractCount} contracts total.`);

  if (urgent.length > 0) {
    sections.push(
      `URGENT (${urgent.length}):\n${urgent.map((i) => `- ${i.title}: ${i.reason}`).join("\n")}`,
    );
  }

  if (watch.length > 0) {
    sections.push(
      `WATCH (${watch.length}):\n${watch.map((i) => `- ${i.title}: ${i.reason}`).join("\n")}`,
    );
  }

  const flags: string[] = [];
  if (intelligence.vendorDependency.flagged) {
    flags.push(
      `Vendor concentration: ${intelligence.vendorDependency.percentage}% with ${intelligence.vendorDependency.vendor}`,
    );
  }
  if (intelligence.termsInconsistency.flagged) {
    flags.push(
      `Terms inconsistency in ${intelligence.termsInconsistency.type} contracts`,
    );
  }
  if (intelligence.liabilityOutlier.flagged) {
    flags.push(
      `Liability outlier: ${intelligence.liabilityOutlier.contractTitle} (${intelligence.liabilityOutlier.deviationPct}% below peer avg)`,
    );
  }
  if (intelligence.riskHotspot.flagged) {
    flags.push(
      `Risk hotspot: ${intelligence.riskHotspot.category} contracts elevated`,
    );
  }

  if (flags.length > 0) {
    sections.push(`PORTFOLIO FLAGS:\n${flags.map((f) => `- ${f}`).join("\n")}`);
  }

  return `You are a contract advisor writing a morning briefing. List the top 3 priorities the user should focus on today as numbered items (1. 2. 3.).

Rules:
- Each item: one sentence, direct and actionable
- Reference specific contracts by name
- Lead with the most urgent item
- Do NOT include headers, markdown, or extra commentary

${sections.join("\n\n")}

Return ONLY the numbered list (1. 2. 3.), nothing else.`;
}

export async function generateNarrativeBriefing(
  items: BriefingItem[],
  intelligence: PortfolioIntelligence,
  contractCount: number,
): Promise<NarrativeBriefing> {
  const portfolioFlags = countPortfolioFlags(intelligence);

  // If no contracts, return empty narrative
  if (contractCount === 0) {
    return {
      narrative: "",
      generatedAt: new Date().toISOString(),
      stats: {
        totalContracts: 0,
        urgentCount: 0,
        watchCount: 0,
        portfolioFlags: 0,
      },
    };
  }

  const prompt = buildNarrativePrompt(items, intelligence, contractCount);
  const response = await extractionAgent.generate([
    { role: "user", content: prompt },
  ]);

  return {
    narrative: response.text,
    generatedAt: new Date().toISOString(),
    stats: {
      totalContracts: contractCount,
      urgentCount: items.filter((i) => i.urgency === "urgent").length,
      watchCount: items.filter((i) => i.urgency === "watch").length,
      portfolioFlags,
    },
  };
}
