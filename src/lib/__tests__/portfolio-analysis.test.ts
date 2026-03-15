import { describe, expect, it } from "bun:test";
import {
  computePortfolioIntelligence,
  detectLiabilityOutlier,
  detectRiskHotspot,
  detectTermsInconsistency,
  detectVendorDependency,
} from "../portfolio-analysis";
import { makeContract } from "./fixtures";

describe("detectVendorDependency", () => {
  it("flags when one vendor exceeds 30% of total spend", () => {
    const contracts = [
      makeContract({
        id: "1",
        total_value: 80000,
        parties: [{ name: "Acme Corp", role: "Vendor" }],
      }),
      makeContract({
        id: "2",
        total_value: 10000,
        parties: [{ name: "Beta Inc", role: "Vendor" }],
      }),
      makeContract({
        id: "3",
        total_value: 10000,
        parties: [{ name: "Gamma LLC", role: "Vendor" }],
      }),
    ];
    const result = detectVendorDependency(contracts);
    expect(result.flagged).toBe(true);
    expect(result.vendor).toBe("Acme Corp");
    expect(result.percentage).toBe(80);
    expect(result.contractCount).toBe(1);
  });

  it("does not flag when spend is well distributed", () => {
    const contracts = [
      makeContract({
        id: "1",
        total_value: 25000,
        parties: [{ name: "Acme Corp", role: "Vendor" }],
      }),
      makeContract({
        id: "2",
        total_value: 25000,
        parties: [{ name: "Beta Inc", role: "Vendor" }],
      }),
      makeContract({
        id: "3",
        total_value: 25000,
        parties: [{ name: "Gamma LLC", role: "Vendor" }],
      }),
      makeContract({
        id: "4",
        total_value: 25000,
        parties: [{ name: "Delta Co", role: "Vendor" }],
      }),
    ];
    const result = detectVendorDependency(contracts);
    expect(result.flagged).toBe(false);
  });

  it("returns not flagged when no contracts have value", () => {
    const contracts = [
      makeContract({ id: "1", total_value: null }),
      makeContract({ id: "2", total_value: null }),
    ];
    const result = detectVendorDependency(contracts);
    expect(result.flagged).toBe(false);
  });
});

describe("detectTermsInconsistency", () => {
  it("flags when liability caps vary 3x+ within same type", () => {
    const contracts = [
      makeContract({ id: "1", contract_type: "SaaS", liability_cap: 10000 }),
      makeContract({ id: "2", contract_type: "SaaS", liability_cap: 50000 }),
    ];
    const result = detectTermsInconsistency(contracts);
    expect(result.flagged).toBe(true);
    expect(result.type).toBe("SaaS");
    expect(result.metric).toBe("liability_cap");
    expect(result.range?.min).toBe(10000);
    expect(result.range?.max).toBe(50000);
  });

  it("does not flag when caps are within range", () => {
    const contracts = [
      makeContract({ id: "1", contract_type: "SaaS", liability_cap: 40000 }),
      makeContract({ id: "2", contract_type: "SaaS", liability_cap: 50000 }),
    ];
    const result = detectTermsInconsistency(contracts);
    expect(result.flagged).toBe(false);
  });

  it("does not flag single contract per type", () => {
    const contracts = [
      makeContract({ id: "1", contract_type: "SaaS", liability_cap: 10000 }),
      makeContract({ id: "2", contract_type: "NDA", liability_cap: 100000 }),
    ];
    const result = detectTermsInconsistency(contracts);
    expect(result.flagged).toBe(false);
  });
});

describe("detectLiabilityOutlier", () => {
  it("flags contract with cap far below peers", () => {
    const contracts = [
      makeContract({
        id: "1",
        title: "Cheap Deal",
        contract_type: "SaaS",
        liability_cap: 5000,
      }),
      makeContract({ id: "2", contract_type: "SaaS", liability_cap: 50000 }),
      makeContract({ id: "3", contract_type: "SaaS", liability_cap: 45000 }),
    ];
    const result = detectLiabilityOutlier(contracts);
    expect(result.flagged).toBe(true);
    expect(result.contractTitle).toBe("Cheap Deal");
    expect(result.contractId).toBe("1");
    expect(result.cap).toBe(5000);
  });

  it("does not flag when caps are similar", () => {
    const contracts = [
      makeContract({ id: "1", contract_type: "SaaS", liability_cap: 45000 }),
      makeContract({ id: "2", contract_type: "SaaS", liability_cap: 50000 }),
      makeContract({ id: "3", contract_type: "SaaS", liability_cap: 48000 }),
    ];
    const result = detectLiabilityOutlier(contracts);
    expect(result.flagged).toBe(false);
  });
});

describe("detectRiskHotspot", () => {
  it("flags category with risk significantly above portfolio average", () => {
    const contracts = [
      makeContract({ id: "1", contract_type: "SaaS", risk_score: "high" }),
      makeContract({ id: "2", contract_type: "SaaS", risk_score: "critical" }),
      makeContract({ id: "3", contract_type: "NDA", risk_score: "low" }),
      makeContract({ id: "4", contract_type: "NDA", risk_score: "low" }),
      makeContract({ id: "5", contract_type: "Lease", risk_score: "low" }),
      makeContract({ id: "6", contract_type: "Lease", risk_score: "low" }),
    ];
    const result = detectRiskHotspot(contracts);
    expect(result.flagged).toBe(true);
    expect(result.category).toBe("SaaS");
  });

  it("does not flag when risk is evenly distributed", () => {
    const contracts = [
      makeContract({ id: "1", contract_type: "SaaS", risk_score: "medium" }),
      makeContract({ id: "2", contract_type: "SaaS", risk_score: "medium" }),
      makeContract({ id: "3", contract_type: "NDA", risk_score: "medium" }),
      makeContract({ id: "4", contract_type: "NDA", risk_score: "medium" }),
    ];
    const result = detectRiskHotspot(contracts);
    expect(result.flagged).toBe(false);
  });
});

describe("computePortfolioIntelligence", () => {
  it("returns all four analysis results", () => {
    const contracts = [
      makeContract({ id: "1", total_value: 50000 }),
      makeContract({
        id: "2",
        total_value: 50000,
        parties: [{ name: "Other Corp", role: "Vendor" }],
      }),
    ];
    const result = computePortfolioIntelligence(contracts);
    expect(result).toHaveProperty("vendorDependency");
    expect(result).toHaveProperty("termsInconsistency");
    expect(result).toHaveProperty("liabilityOutlier");
    expect(result).toHaveProperty("riskHotspot");
    expect(typeof result.vendorDependency.flagged).toBe("boolean");
    expect(typeof result.termsInconsistency.flagged).toBe("boolean");
    expect(typeof result.liabilityOutlier.flagged).toBe("boolean");
    expect(typeof result.riskHotspot.flagged).toBe("boolean");
  });
});
