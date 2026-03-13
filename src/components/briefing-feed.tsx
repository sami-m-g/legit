"use client";

import { useCallback, useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import type { ActionStatus, BriefingItem } from "@/lib/types";
import { futureDateString } from "@/lib/utils";
import { BriefingCard } from "./briefing-card";

interface BriefingFeedProps {
  onViewContract: (id: string) => void;
  refreshKey: number;
}

function SectionHeader({ label, count }: { label: string; count: number }) {
  if (count === 0) return null;
  return (
    <div className="flex items-center gap-2 mb-2">
      <span className="text-xs font-semibold uppercase tracking-wide text-primary">
        {label}
      </span>
      <span className="text-xs px-1.5 py-0.5 rounded-full font-medium bg-muted text-muted-foreground">
        {count}
      </span>
    </div>
  );
}

export function BriefingFeed({
  onViewContract,
  refreshKey,
}: BriefingFeedProps) {
  const [items, setItems] = useState<BriefingItem[]>([]);
  const [loading, setLoading] = useState(true);

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
    const body: { status: ActionStatus; snoozed_until?: string } = { status };
    if (status === "snoozed") body.snoozed_until = futureDateString(7);
    const res = await fetch(`/api/contracts/${contractId}/action`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok)
      setItems((prev) => prev.filter((i) => i.contractId !== contractId));
  }

  if (loading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-xl border p-6 text-center bg-card">
        <p className="text-2xl mb-2">✅</p>
        <p className="font-medium text-foreground">All caught up</p>
        <p className="text-sm mt-1 text-muted-foreground">
          No items require your attention right now.
        </p>
      </div>
    );
  }

  const sections = [
    { label: "Urgent", items: items.filter((i) => i.urgency === "urgent") },
    { label: "Watch", items: items.filter((i) => i.urgency === "watch") },
    { label: "Info", items: items.filter((i) => i.urgency === "info") },
  ];

  return (
    <div className="space-y-6">
      {sections.map(({ label, items: sectionItems }) =>
        sectionItems.length > 0 ? (
          <div key={label}>
            <SectionHeader label={label} count={sectionItems.length} />
            <div className="space-y-2">
              {sectionItems.map((item) => (
                <BriefingCard
                  key={item.contractId}
                  item={item}
                  onAction={handleAction}
                  onView={onViewContract}
                />
              ))}
            </div>
          </div>
        ) : null,
      )}
    </div>
  );
}
