"use client";

import { Badge } from "@/components/ui/badge";
import type { ContractSummary } from "@/lib/types";
import { daysUntil } from "@/lib/utils";

interface RenewalsTimelineProps {
  contracts: ContractSummary[];
  onSelect: (id: string) => void;
}

function urgencyClass(
  days: number | null,
  autoRenewal: boolean | null,
): string {
  if (days === null) return "bg-stone-100 text-stone-600 border-stone-200";
  if (days < 0) return "bg-red-100 text-red-700 border-red-200";
  if (days <= 45 && autoRenewal)
    return "bg-red-100 text-red-700 border-red-200";
  if (days <= 90) return "bg-amber-100 text-amber-700 border-amber-200";
  return "bg-stone-100 text-stone-600 border-stone-200";
}

export function RenewalsTimeline({
  contracts,
  onSelect,
}: RenewalsTimelineProps) {
  const today = new Date();

  const withDates = contracts
    .filter((c) => c.renewal_date ?? c.expiration_date)
    .map((c) => {
      const dateStr = c.renewal_date ?? c.expiration_date;
      const date = dateStr ? new Date(dateStr) : null;
      return {
        ...c,
        renewalDateParsed: date,
        daysToRenewal: date ? daysUntil(date, today) : null,
      };
    })
    .sort((a, b) => {
      if (a.daysToRenewal === null) return 1;
      if (b.daysToRenewal === null) return -1;
      return a.daysToRenewal - b.daysToRenewal;
    });

  if (withDates.length === 0)
    return (
      <p className="py-4 text-sm text-muted-foreground">
        No contracts with renewal dates.
      </p>
    );

  return (
    <div className="space-y-2">
      {withDates.map((c) => {
        const days = c.daysToRenewal;
        const label =
          days === null
            ? "No date"
            : days < 0
              ? `${Math.abs(days)}d overdue`
              : days === 0
                ? "Today"
                : `${days}d`;
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onSelect(c.id)}
            className="w-full text-left rounded-xl border bg-card p-4 transition-colors hover:border-muted-foreground"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="font-medium truncate text-foreground">
                  {c.title ?? c.filename}
                </p>
                <p className="text-sm mt-0.5 text-muted-foreground">
                  {c.contract_type ?? "Unknown"} ·{" "}
                  {c.auto_renewal ? "Auto-renews" : "Expires"}{" "}
                  {c.renewalDateParsed?.toLocaleDateString()}
                </p>
              </div>
              <Badge
                variant="outline"
                className={`shrink-0 ${urgencyClass(days, c.auto_renewal)}`}
              >
                {label}
              </Badge>
            </div>
          </button>
        );
      })}
    </div>
  );
}
