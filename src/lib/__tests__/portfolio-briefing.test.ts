import { describe, expect, it } from "bun:test";
import { portfolioToBriefingItems } from "../portfolio-briefing";
import type { PortfolioIntelligence } from "../types";
import { makeContract } from "./fixtures";

const baseIntelligence: PortfolioIntelligence = {
  vendorDependency: { flagged: false },
  termsInconsistency: { flagged: false },
  liabilityOutlier: { flagged: false },
  riskHotspot: { flagged: false },
};

describe("portfolioToBriefingItems", () => {
  it("returns empty array when nothing is flagged", () => {
    const items = portfolioToBriefingItems(baseIntelligence, []);
    expect(items).toEqual([]);
  });

  it("creates watch item for vendor dependency", () => {
    const intelligence: PortfolioIntelligence = {
      ...baseIntelligence,
      vendorDependency: {
        flagged: true,
        vendor: "Acme Corp",
        percentage: 62,
        value: 310000,
        contractCount: 3,
      },
    };
    const contracts = [
      makeContract({
        id: "1",
        parties: [{ name: "Acme Corp", role: "Vendor" }],
      }),
      makeContract({
        id: "2",
        parties: [{ name: "Acme Corp", role: "Vendor" }],
      }),
      makeContract({
        id: "3",
        parties: [{ name: "Acme Corp", role: "Vendor" }],
      }),
    ];
    const items = portfolioToBriefingItems(intelligence, contracts);
    expect(items).toHaveLength(1);
    expect(items[0].urgency).toBe("watch");
    expect(items[0].source).toBe("portfolio");
    expect(items[0].contractId).toBe("portfolio:vendor-dependency");
    expect(items[0].reason).toContain("62%");
    expect(items[0].reason).toContain("Acme Corp");
    expect(items[0].relatedContractIds).toEqual(["1", "2", "3"]);
  });

  it("creates watch item for terms inconsistency", () => {
    const intelligence: PortfolioIntelligence = {
      ...baseIntelligence,
      termsInconsistency: {
        flagged: true,
        type: "SaaS",
        metric: "liability_cap",
        range: { min: 50000, max: 250000 },
      },
    };
    const items = portfolioToBriefingItems(intelligence, []);
    expect(items).toHaveLength(1);
    expect(items[0].urgency).toBe("watch");
    expect(items[0].source).toBe("portfolio");
    expect(items[0].reason).toContain("liability caps");
    expect(items[0].reason).toContain("$50,000");
    expect(items[0].reason).toContain("$250,000");
  });

  it("creates urgent item for liability outlier", () => {
    const intelligence: PortfolioIntelligence = {
      ...baseIntelligence,
      liabilityOutlier: {
        flagged: true,
        contractTitle: "Zendesk Support",
        contractId: "zen-1",
        cap: 50000,
        peerAvg: 125000,
        deviationPct: 60,
      },
    };
    const items = portfolioToBriefingItems(intelligence, []);
    expect(items).toHaveLength(1);
    expect(items[0].urgency).toBe("urgent");
    expect(items[0].source).toBe("portfolio");
    expect(items[0].reason).toContain("60%");
    expect(items[0].reason).toContain("$50,000");
    expect(items[0].relatedContractIds).toEqual(["zen-1"]);
  });

  it("creates watch item for risk hotspot", () => {
    const intelligence: PortfolioIntelligence = {
      ...baseIntelligence,
      riskHotspot: {
        flagged: true,
        category: "SaaS",
        categoryAvgRisk: 3.5,
        portfolioAvgRisk: 2.0,
      },
    };
    const items = portfolioToBriefingItems(intelligence, []);
    expect(items).toHaveLength(1);
    expect(items[0].urgency).toBe("watch");
    expect(items[0].source).toBe("portfolio");
    expect(items[0].reason).toContain("SaaS");
    expect(items[0].reason).toContain("3.5");
  });

  it("creates multiple items when multiple detectors flag", () => {
    const intelligence: PortfolioIntelligence = {
      vendorDependency: {
        flagged: true,
        vendor: "Acme",
        percentage: 50,
        value: 100000,
        contractCount: 2,
      },
      termsInconsistency: {
        flagged: true,
        type: "SaaS",
        metric: "value",
        range: { min: 10000, max: 100000 },
      },
      liabilityOutlier: { flagged: false },
      riskHotspot: { flagged: false },
    };
    const contracts = [
      makeContract({
        id: "1",
        parties: [{ name: "Acme", role: "Vendor" }],
      }),
    ];
    const items = portfolioToBriefingItems(intelligence, contracts);
    expect(items).toHaveLength(2);
  });
});
