"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { ActionStatus, BriefingItem } from "@/lib/types";

const URGENCY: Record<
  BriefingItem["urgency"],
  { icon: string; label: string; cardClass: string; badgeClass: string }
> = {
  urgent: {
    icon: "🔴",
    label: "Urgent",
    cardClass: "bg-red-50 border-red-200",
    badgeClass: "bg-red-100 text-red-700 border-red-200",
  },
  watch: {
    icon: "⚠️",
    label: "Watch",
    cardClass: "bg-amber-50 border-amber-200",
    badgeClass: "bg-amber-100 text-amber-700 border-amber-200",
  },
  info: {
    icon: "📋",
    label: "Info",
    cardClass: "bg-emerald-50 border-emerald-200",
    badgeClass: "bg-emerald-100 text-emerald-700 border-emerald-200",
  },
};

interface BriefingCardProps {
  item: BriefingItem;
  onAction: (contractId: string, status: ActionStatus) => void;
  onView: (contractId: string) => void;
}

export function BriefingCard({ item, onAction, onView }: BriefingCardProps) {
  const cfg = URGENCY[item.urgency];
  return (
    <Card className={`flex gap-3 items-start p-4 ${cfg.cardClass}`}>
      <span className="text-lg mt-0.5 shrink-0">{cfg.icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-medium truncate text-foreground">{item.title}</p>
            <p className="text-sm mt-0.5 text-muted-foreground">
              {item.reason}
            </p>
          </div>
          <Badge variant="outline" className={`shrink-0 ${cfg.badgeClass}`}>
            {cfg.label}
          </Badge>
        </div>
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onAction(item.contractId, item.primaryAction.status)}
          >
            {item.primaryAction.label}
          </Button>
          {item.secondaryAction && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                item.secondaryAction &&
                onAction(item.contractId, item.secondaryAction.status)
              }
            >
              {item.secondaryAction.label}
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="ml-auto"
            onClick={() => onView(item.contractId)}
          >
            View →
          </Button>
        </div>
      </div>
    </Card>
  );
}
