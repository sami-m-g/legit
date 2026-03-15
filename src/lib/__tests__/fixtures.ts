import type { PortfolioContractRow } from "../types";

export const makeContract = (
  overrides: Partial<PortfolioContractRow>,
): PortfolioContractRow => ({
  id: "test-id",
  title: "Test Contract",
  contract_type: "SaaS",
  parties: [{ name: "TestVendor Inc", role: "Vendor" }],
  total_value: 10000,
  liability_cap: 50000,
  risk_score: "medium",
  ...overrides,
});
