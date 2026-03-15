"use client";

import {
  AlertCircle,
  AlertTriangle,
  Check,
  Info,
  Loader2,
  X,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type {
  ActionStatus,
  BriefingActionType,
  BriefingItem,
  CrossVendorContext,
} from "@/lib/types";

const URGENCY: Record<
  BriefingItem["urgency"],
  {
    Icon: React.ElementType;
    label: string;
    borderClass: string;
    iconClass: string;
    badgeClass: string;
  }
> = {
  urgent: {
    Icon: AlertCircle,
    label: "Urgent",
    borderClass: "border-l-4 border-red-400",
    iconClass: "text-red-500",
    badgeClass: "bg-red-100 text-red-700 border-red-200",
  },
  watch: {
    Icon: AlertTriangle,
    label: "Watch",
    borderClass: "border-l-4 border-amber-400",
    iconClass: "text-amber-500",
    badgeClass: "bg-amber-100 text-amber-700 border-amber-200",
  },
  info: {
    Icon: Info,
    label: "Info",
    borderClass: "border-l-4 border-emerald-400",
    iconClass: "text-emerald-500",
    badgeClass: "bg-emerald-100 text-emerald-700 border-emerald-200",
  },
};

const BODY_INDENT = "pl-6";

const DRAFT_ACTION_LABELS: Partial<Record<BriefingActionType, string>> = {
  cancel: "Generating cancellation notice...",
  renew: "Generating renewal strategy...",
};

interface BriefingCardProps {
  item: BriefingItem;
  onAction: (contractId: string, status: ActionStatus) => void;
  onView: (contractId: string) => void;
}

type ExecuteResult = {
  draft?: string;
  crossVendorContext?: CrossVendorContext;
};

export function BriefingCard({ item, onAction, onView }: BriefingCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ExecuteResult | null>(null);
  const [draftText, setDraftText] = useState("");

  const cfg = URGENCY[item.urgency];

  async function handlePrimaryClick() {
    const { actionType } = item.primaryAction;

    // For actions with drafts (cancel/renew), expand inline
    if (actionType && (actionType === "cancel" || actionType === "renew")) {
      setExpanded(true);
      setLoading(true);
      try {
        const res = await fetch(
          `/api/contracts/${item.contractId}/execute-action`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: actionType }),
          },
        );
        const data = await res.json();
        setResult(data);
        setDraftText(data.draft ?? "");
      } catch {
        setResult({ draft: "Failed to generate draft. Please try again." });
        setDraftText("Failed to generate draft. Please try again.");
      } finally {
        setLoading(false);
      }
      return;
    }

    // For simple actions, do immediate status change
    onAction(item.contractId, item.primaryAction.status);
  }

  function handleConfirm() {
    // Card dismisses from feed
    onAction(item.contractId, item.primaryAction.status);
  }

  function handleCancel() {
    setExpanded(false);
    setResult(null);
    setDraftText("");
  }

  function handleViewClick() {
    onView(item.contractId);
  }

  return (
    <Card
      className={`flex flex-col gap-3 p-5 border-0 shadow-sm ${cfg.borderClass}`}
    >
      {/* Header row */}
      <div className="flex items-start gap-2">
        <cfg.Icon className={`w-4 h-4 mt-0.5 shrink-0 ${cfg.iconClass}`} />
        <p className="flex-1 min-w-0 font-medium truncate text-foreground">
          {item.title}
        </p>
        <Badge variant="outline" className={`shrink-0 ${cfg.badgeClass}`}>
          {cfg.label}
        </Badge>
      </div>

      {/* Body text */}
      <p className={`text-sm text-muted-foreground ${BODY_INDENT}`}>
        {item.reason}
      </p>
      {item.recommendation && (
        <p className={`text-xs text-muted-foreground italic ${BODY_INDENT}`}>
          {item.recommendation}
        </p>
      )}

      {/* Inline expansion for draft actions */}
      {expanded && (
        <div className={`${BODY_INDENT} space-y-3`}>
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
              <Loader2 className="w-4 h-4 animate-spin" />
              {(item.primaryAction.actionType &&
                DRAFT_ACTION_LABELS[item.primaryAction.actionType]) ??
                "Processing..."}
            </div>
          ) : (
            <>
              <textarea
                value={draftText}
                onChange={(e) => setDraftText(e.target.value)}
                className="w-full min-h-[120px] rounded-lg border bg-muted/30 p-3 text-sm font-mono resize-y focus:outline-none focus:ring-1 focus:ring-primary"
              />
              {result?.crossVendorContext?.sameVendor &&
                result.crossVendorContext.sameVendor.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Related: {result.crossVendorContext.sameVendor.length} other
                    contract
                    {result.crossVendorContext.sameVendor.length === 1
                      ? ""
                      : "s"}{" "}
                    with this vendor
                  </p>
                )}
              {result?.crossVendorContext?.insight && (
                <p className="text-xs text-amber-700 bg-amber-50 rounded px-2 py-1">
                  {result.crossVendorContext.insight}
                </p>
              )}
              <div className="flex gap-2">
                <Button size="sm" onClick={handleConfirm}>
                  <Check className="w-3 h-3" />
                  Confirm & Apply
                </Button>
                <Button size="sm" variant="ghost" onClick={handleCancel}>
                  <X className="w-3 h-3" />
                  Cancel
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Button row (hidden when expanded) */}
      {!expanded && (
        <div
          className={`flex items-center justify-between pt-1 ${BODY_INDENT}`}
        >
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={handlePrimaryClick}>
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
          </div>
          <Button size="sm" variant="ghost" onClick={handleViewClick}>
            View &rarr;
          </Button>
        </div>
      )}
    </Card>
  );
}
