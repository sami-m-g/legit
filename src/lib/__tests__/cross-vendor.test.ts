import { describe, expect, it } from "bun:test";
import { getCrossVendorContext } from "../cross-vendor";
import { makeContract } from "./fixtures";

describe("getCrossVendorContext", () => {
  it("returns empty context for unknown contract", () => {
    const result = getCrossVendorContext("nonexistent", [
      makeContract({ id: "1" }),
    ]);
    expect(result.sameVendor).toEqual([]);
    expect(result.sameCategory).toEqual([]);
    expect(result.insight).toBeNull();
  });

  it("finds same-vendor contracts", () => {
    const contracts = [
      makeContract({
        id: "1",
        title: "Acme Phase 1",
        parties: [{ name: "Acme Corp", role: "Vendor" }],
      }),
      makeContract({
        id: "2",
        title: "Acme Phase 2",
        parties: [{ name: "Acme Corp", role: "Vendor" }],
      }),
      makeContract({
        id: "3",
        title: "Other Vendor",
        parties: [{ name: "Beta Inc", role: "Vendor" }],
      }),
    ];
    const result = getCrossVendorContext("1", contracts);
    expect(result.sameVendor).toHaveLength(1);
    expect(result.sameVendor[0].id).toBe("2");
    expect(result.sameVendor[0].title).toBe("Acme Phase 2");
  });

  it("finds same-category contracts", () => {
    const contracts = [
      makeContract({
        id: "1",
        title: "CRM 1",
        contract_type: "SaaS",
        parties: [{ name: "Salesforce", role: "Vendor" }],
      }),
      makeContract({
        id: "2",
        title: "CRM 2",
        contract_type: "SaaS",
        parties: [{ name: "HubSpot", role: "Vendor" }],
      }),
      makeContract({
        id: "3",
        title: "Lease",
        contract_type: "Lease",
        parties: [{ name: "WeWork", role: "Landlord" }],
      }),
    ];
    const result = getCrossVendorContext("1", contracts);
    expect(result.sameCategory).toHaveLength(1);
    expect(result.sameCategory[0].id).toBe("2");
    expect(result.sameCategory[0].vendor).toBe("HubSpot");
  });

  it("generates insight when target costs significantly more than peers", () => {
    const contracts = [
      makeContract({
        id: "1",
        title: "Expensive CRM",
        contract_type: "SaaS",
        total_value: 200000,
        parties: [{ name: "Salesforce", role: "Vendor" }],
      }),
      makeContract({
        id: "2",
        title: "Cheap CRM",
        contract_type: "SaaS",
        total_value: 50000,
        parties: [{ name: "HubSpot", role: "Provider" }],
      }),
    ];
    const result = getCrossVendorContext("1", contracts);
    expect(result.insight).not.toBeNull();
    expect(result.insight).toContain("HubSpot");
  });

  it("no insight when costs are similar", () => {
    const contracts = [
      makeContract({
        id: "1",
        title: "CRM 1",
        contract_type: "SaaS",
        total_value: 50000,
        parties: [{ name: "Salesforce", role: "Vendor" }],
      }),
      makeContract({
        id: "2",
        title: "CRM 2",
        contract_type: "SaaS",
        total_value: 45000,
        parties: [{ name: "HubSpot", role: "Vendor" }],
      }),
    ];
    const result = getCrossVendorContext("1", contracts);
    expect(result.insight).toBeNull();
  });
});
