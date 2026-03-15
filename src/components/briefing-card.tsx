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
import { DraftDialog } from "@/components/draft-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DRAFT_ACTION_LABELS,
  DRAFT_DIALOG_TITLES,
} from "@/lib/draft-constants";
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
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [result, setResult] = useState<ExecuteResult | null>(null);
  const [draftText, setDraftText] = useState("");
  const [draftActionType, setDraftActionType] =
    useState<BriefingActionType | null>(null);

  const cfg = URGENCY[item.urgency];

  async function handlePrimaryClick() {
    const { actionType } = item.primaryAction;

    // For verify, navigate to contract viewer
    if (actionType === "verify") {
      onView(item.contractId);
      return;
    }

    // For actions with drafts, fetch and open dialog
    if (actionType && actionType in DRAFT_ACTION_LABELS) {
      setDraftActionType(actionType);
      setDialogOpen(true);
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
    setDialogOpen(false);
    onAction(item.contractId, item.primaryAction.status);
  }

  function handleDialogClose() {
    setDialogOpen(false);
    setResult(null);
    setDraftText("");
    setDraftActionType(null);
  }

  function handleViewClick() {
    onView(item.contractId);
  }

  return (
    <>
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

        {/* Inline loading indicator */}
        {loading && (
          <div
            className={`${BODY_INDENT} flex items-center gap-2 text-sm text-muted-foreground py-2`}
          >
            <Loader2 className="w-4 h-4 animate-spin" />
            {(draftActionType && DRAFT_ACTION_LABELS[draftActionType]) ??
              "Processing..."}
          </div>
        )}

        {/* Button row (hidden when loading) */}
        {!loading && (
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

      {/* Draft Dialog */}
      {draftActionType && (
        <DraftDialog
          open={dialogOpen && !loading}
          onOpenChange={(open) => !open && handleDialogClose()}
          title={DRAFT_DIALOG_TITLES[draftActionType] ?? "Draft"}
          subtitle={`${item.title} — Review and edit before confirming.`}
          draft={draftText}
          onDraftChange={setDraftText}
          crossVendorContext={result?.crossVendorContext}
          footer={
            <>
              <Button variant="ghost" onClick={handleDialogClose}>
                <X className="w-3 h-3" />
                Cancel
              </Button>
              <Button onClick={handleConfirm}>
                <Check className="w-3 h-3" />
                Confirm & Apply
              </Button>
            </>
          }
        />
      )}
    </>
  );
}
