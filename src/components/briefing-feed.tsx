"use client";

import { CheckCircle2, ChevronDown } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import type { ActionStatus, BriefingItem } from "@/lib/types";
import { BriefingCard } from "./briefing-card";

interface BriefingFeedProps {
  onViewContract: (id: string) => void;
  refreshKey: number;
  onRefreshNeeded: () => void;
}

const DEFAULT_EXPANDED = new Set(["urgent", "watch"]);

function SectionHeader({
  label,
  count,
  expanded,
  onToggle,
}: {
  label: string;
  count: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  if (count === 0) return null;
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex items-center gap-2 mb-3 w-full group"
    >
      <ChevronDown
        className={`w-3.5 h-3.5 text-muted-foreground transition-transform duration-200 ${
          expanded ? "" : "-rotate-90"
        }`}
      />
      <span className="text-xs font-semibold uppercase tracking-wide text-primary">
        {label}
      </span>
      <span className="text-xs px-1.5 py-0.5 rounded-full font-medium bg-muted text-muted-foreground">
        {count}
      </span>
    </button>
  );
}

export function BriefingFeed({
  onViewContract,
  refreshKey,
  onRefreshNeeded,
}: BriefingFeedProps) {
  const [items, setItems] = useState<BriefingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(DEFAULT_EXPANDED),
  );

  const toggleSection = useCallback((key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const fetchBriefing = useCallback(() => {
    setLoading(true);
    fetch("/api/briefing")
      .then((r) => r.json())
      .then((data: { items: BriefingItem[] }) => setItems(data.items ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: refreshKey is an intentional trigger
  useEffect(() => {
    fetchBriefing();
  }, [refreshKey, fetchBriefing]);

  async function handleAction(contractId: string, status: ActionStatus) {
    const body: { status: ActionStatus } = { status };
    const res = await fetch(`/api/contracts/${contractId}/action`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      setItems((prev) => prev.filter((i) => i.contractId !== contractId));
      onRefreshNeeded();
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        <p className="text-xs text-muted-foreground animate-pulse">
          Loading action items...
        </p>
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-xl border p-8 text-center bg-card">
        <CheckCircle2 className="w-8 h-8 mx-auto mb-3 text-emerald-500" />
        <p className="font-medium text-foreground">No action items</p>
        <p className="text-sm mt-1 text-muted-foreground">
          All contracts are in good standing.
        </p>
      </div>
    );
  }

  const sections = [
    {
      key: "urgent",
      label: "Urgent",
      items: items.filter((i) => i.urgency === "urgent"),
    },
    {
      key: "watch",
      label: "Watch",
      items: items.filter((i) => i.urgency === "watch"),
    },
    {
      key: "info",
      label: "Info",
      items: items.filter((i) => i.urgency === "info"),
    },
  ];

  return (
    <div className="space-y-8">
      {sections.map(({ key, label, items: sectionItems }) =>
        sectionItems.length > 0 ? (
          <div key={key}>
            <SectionHeader
              label={label}
              count={sectionItems.length}
              expanded={expanded.has(key)}
              onToggle={() => toggleSection(key)}
            />
            {expanded.has(key) && (
              <div className="space-y-4">
                {sectionItems.map((item) => (
                  <BriefingCard
                    key={item.contractId}
                    item={item}
                    onAction={handleAction}
                    onView={onViewContract}
                  />
                ))}
              </div>
            )}
          </div>
        ) : null,
      )}
    </div>
  );
}
