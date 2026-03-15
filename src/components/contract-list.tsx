"use client";

import { Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { ActionStatus, ContractSummary } from "@/lib/types";

interface ContractListProps {
  onSelect: (id: string) => void;
  refreshKey: number;
}

const STATUS_BADGE: Record<
  ContractSummary["status"],
  { className: string; label: string }
> = {
  processing: {
    className: "bg-amber-100 text-amber-700 border-amber-200",
    label: "Processing",
  },
  extracted: {
    className: "bg-emerald-100 text-emerald-700 border-emerald-200",
    label: "Extracted",
  },
  partial: {
    className: "bg-amber-100 text-amber-700 border-amber-200",
    label: "Partial",
  },
};

const ACTION_BADGE: Partial<
  Record<ActionStatus, { className: string; label: string }>
> = {
  flagged: {
    className: "bg-amber-100 text-amber-800 border-amber-200",
    label: "Flagged",
  },
  cancelled: {
    className: "bg-red-100 text-red-700 border-red-200",
    label: "Cancelled",
  },
  reviewed: {
    className: "bg-emerald-100 text-emerald-700 border-emerald-200",
    label: "Reviewed",
  },
};

export function ContractList({ onSelect, refreshKey }: ContractListProps) {
  const [contracts, setContracts] = useState<ContractSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: refreshKey is an intentional trigger
  useEffect(() => {
    setLoading(true);
    fetch("/api/contracts/list")
      .then((r) => r.json())
      .then((data: { contracts: ContractSummary[] }) =>
        setContracts(data.contracts ?? []),
      )
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [refreshKey]);

  async function handleDelete(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    if (!confirm("Delete this contract? This cannot be undone.")) return;
    setDeleting(id);
    try {
      await fetch(`/api/contracts/${id}`, { method: "DELETE" });
      setContracts((prev) => prev.filter((c) => c.id !== id));
    } finally {
      setDeleting(null);
    }
  }

  if (loading)
    return (
      <div className="space-y-2">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );

  if (contracts.length === 0)
    return (
      <div className="rounded-xl border border-dashed p-8 text-center bg-card">
        <p className="text-sm font-medium text-foreground">No contracts yet</p>
        <p className="text-xs mt-1 text-muted-foreground">
          Drop a PDF above to get started.
        </p>
      </div>
    );

  return (
    <div className="space-y-2">
      {contracts.map((c) => {
        const ab = c.action_status ? ACTION_BADGE[c.action_status] : null;
        const sb = STATUS_BADGE[c.status];
        return (
          <div
            key={c.id}
            className="flex items-center gap-2 rounded-xl shadow-sm bg-card transition-shadow group hover:shadow-md"
          >
            <button
              type="button"
              onClick={() => onSelect(c.id)}
              className="flex-1 text-left p-4 min-w-0"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-medium truncate text-foreground">
                    {c.title ?? c.filename}
                  </p>
                  <p className="text-sm mt-0.5 text-muted-foreground">
                    {c.contract_type ?? "Unknown type"} &middot;{" "}
                    {c.expiration_date
                      ? `Expires ${new Date(c.expiration_date).toLocaleDateString()}`
                      : "No expiry"}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {ab && (
                    <Badge variant="outline" className={ab.className}>
                      {ab.label}
                    </Badge>
                  )}
                  <Badge variant="outline" className={sb.className}>
                    {sb.label}
                  </Badge>
                </div>
              </div>
            </button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={(e) => handleDelete(e, c.id)}
              disabled={deleting === c.id}
              className="mr-1 opacity-0 group-hover:opacity-100 disabled:opacity-50 hover:text-red-400"
              title="Delete contract"
            >
              {deleting === c.id ? (
                <span className="text-xs">…</span>
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
            </Button>
          </div>
        );
      })}
    </div>
  );
}
