"use client";

import { Badge } from "@/components/ui/badge";
import type { ContractSummary } from "@/lib/types";

interface VendorGroupsProps {
  contracts: ContractSummary[];
  onSelect: (id: string) => void;
}

function getVendorName(c: ContractSummary): string {
  const vendor = c.parties?.find(
    (p) =>
      ![
        "Customer",
        "Client",
        "Licensee",
        "Tenant",
        "Employer",
        "Disclosing Party",
      ].includes(p.role),
  );
  return vendor?.name ?? c.parties?.[0]?.name ?? "Unknown Vendor";
}

export function VendorGroups({ contracts, onSelect }: VendorGroupsProps) {
  const groups = new Map<string, ContractSummary[]>();
  for (const c of contracts) {
    const vendor = getVendorName(c);
    if (!groups.has(vendor)) groups.set(vendor, []);
    groups.get(vendor)?.push(c);
  }

  const sorted = [...groups.entries()].sort(
    (a, b) => b[1].length - a[1].length,
  );

  if (sorted.length === 0)
    return (
      <p className="py-4 text-sm text-muted-foreground">
        No contracts uploaded yet.
      </p>
    );

  return (
    <div className="space-y-4">
      {sorted.map(([vendor, vendorContracts]) => (
        <div key={vendor}>
          <div className="flex items-center gap-2 mb-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">
              {vendor}
            </p>
            <Badge variant="secondary" className="text-xs">
              {vendorContracts.length} contract
              {vendorContracts.length !== 1 ? "s" : ""}
            </Badge>
          </div>
          <div className="space-y-1.5 pl-2 border-l">
            {vendorContracts.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => onSelect(c.id)}
                className="w-full text-left rounded-lg px-3 py-2 transition-colors hover:bg-muted"
              >
                <p className="text-sm font-medium text-foreground">
                  {c.title ?? c.filename}
                </p>
                <p className="text-xs mt-0.5 text-muted-foreground">
                  {c.contract_type ?? "Unknown type"} ·{" "}
                  {c.expiration_date
                    ? `Expires ${new Date(c.expiration_date).toLocaleDateString()}`
                    : "No expiry"}
                </p>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
