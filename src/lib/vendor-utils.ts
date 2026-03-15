import type { PortfolioContractRow } from "./types";

export const VENDOR_ROLES = [
  "Vendor",
  "Provider",
  "Licensor",
  "Landlord",
  "Agency",
  "Supplier",
];
export const SIMILARITY_THRESHOLD = 0.4;

export function getVendorName(contract: PortfolioContractRow): string | null {
  return (
    contract.parties?.find((p) => VENDOR_ROLES.includes(p.role))?.name ?? null
  );
}
