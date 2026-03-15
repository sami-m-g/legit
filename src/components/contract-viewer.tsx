"use client";

import { Check, ChevronLeft, Loader2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import type {
  ActionStatus,
  BriefingActionType,
  ContractDetail,
  CrossVendorContext,
} from "@/lib/types";
import { cn, getConfidenceStatus } from "@/lib/utils";

interface ContractViewerProps {
  contractId: string;
  onBack: () => void;
}

function Field({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  if (!value) return null;
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-semibold uppercase tracking-wide text-primary mb-2">
      {children}
    </h2>
  );
}

type ActionDraft = {
  action: BriefingActionType;
  loading: boolean;
  draft: string;
  crossVendorContext?: CrossVendorContext;
};

const CONTEXT_ACTIONS: Array<{
  action: BriefingActionType;
  label: string;
  variant: "default" | "outline" | "destructive";
}> = [
  { action: "cancel", label: "Cancel Contract", variant: "destructive" },
  { action: "renew", label: "Plan Renewal", variant: "outline" },
  { action: "flag", label: "Flag for Legal", variant: "outline" },
];

export function ContractViewer({ contractId, onBack }: ContractViewerProps) {
  const [contract, setContract] = useState<ContractDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionStatus, setActionStatus] = useState<ActionStatus | null>(null);
  const [actionDraft, setActionDraft] = useState<ActionDraft | null>(null);

  useEffect(() => {
    fetch(`/api/contracts/${contractId}`)
      .then((r) => r.json())
      .then((data: { contract: ContractDetail }) => {
        setContract(data.contract);
        setActionStatus(
          (data.contract.action_status as ActionStatus) ?? "active",
        );
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [contractId]);

  async function handleAction(status: ActionStatus) {
    const body: { status: ActionStatus } = { status };
    const res = await fetch(`/api/contracts/${contractId}/action`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) setActionStatus(status);
  }

  async function handleExecuteAction(action: BriefingActionType) {
    if (action === "flag") {
      handleAction("flagged");
      return;
    }

    setActionDraft({ action, loading: true, draft: "" });
    try {
      const res = await fetch(`/api/contracts/${contractId}/execute-action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      setActionDraft({
        action,
        loading: false,
        draft: data.draft ?? "",
        crossVendorContext: data.crossVendorContext,
      });
      setActionStatus(data.status);
    } catch {
      setActionDraft({
        action,
        loading: false,
        draft: "Failed to generate draft.",
      });
    }
  }

  if (loading)
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  if (!contract)
    return <p className="p-4 text-destructive">Contract not found.</p>;

  const confidenceStatus = getConfidenceStatus(contract.extraction_confidence);

  const riskFlags = contract.risk_flags ?? [];
  const riskScore = contract.risk_score ?? "unknown";
  const negotiationPoints = contract.negotiation_points ?? [];

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="flex items-center gap-4 p-4">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ChevronLeft className="w-4 h-4" />
            Back
          </Button>
          <h1 className="font-semibold truncate text-foreground">
            {contract.title ?? contract.filename}
          </h1>
          <Badge
            variant="outline"
            className={cn(
              "ml-auto",
              confidenceStatus === "verified"
                ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                : "bg-amber-100 text-amber-700 border-amber-200",
            )}
          >
            {confidenceStatus === "verified" ? "Verified" : "Needs Review"}
          </Badge>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* PDF viewer */}
        <div className="flex-1 bg-pdf-viewer">
          <iframe
            src={`/api/contracts/${contractId}/pdf`}
            className="w-full h-full border-0"
            title={contract.filename}
          />
        </div>

        {/* Sidebar — two sections, no tabs */}
        <div className="w-96 overflow-y-auto border-l bg-card p-4 space-y-5">
          {(contract.status === "partial" ||
            contract.status === "processing") && (
            <div className="rounded-lg p-3 text-sm border bg-primary/5 text-muted-foreground">
              {contract.status === "partial"
                ? "Some fields could not be extracted from this document."
                : "Still processing \u2014 check back shortly."}
            </div>
          )}

          {/* Top section: Actions & Risk */}
          <div className="space-y-4">
            <SectionTitle>Actions & Risk</SectionTitle>

            {/* Risk score */}
            {riskScore !== "unknown" && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Risk:</span>
                <span
                  className={cn(
                    "px-2 py-0.5 rounded text-xs font-semibold",
                    riskScore === "critical" && "bg-red-100 text-red-800",
                    riskScore === "high" && "bg-orange-100 text-orange-800",
                    riskScore === "medium" && "bg-yellow-100 text-yellow-800",
                    riskScore === "low" && "bg-green-100 text-green-800",
                  )}
                >
                  {riskScore.toUpperCase()}
                </span>
                {actionStatus && actionStatus !== "active" && (
                  <span className="ml-auto text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">
                    {actionStatus}
                  </span>
                )}
              </div>
            )}

            {/* Context-aware action buttons */}
            <div className="flex flex-wrap gap-2">
              {CONTEXT_ACTIONS.map(({ action, label, variant }) => (
                <Button
                  key={action}
                  size="sm"
                  variant={variant}
                  onClick={() => handleExecuteAction(action)}
                  disabled={actionDraft?.loading}
                >
                  {label}
                </Button>
              ))}
            </div>

            {/* Inline draft expansion */}
            {actionDraft && (
              <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
                {actionDraft.loading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {actionDraft.action === "cancel"
                      ? "Generating cancellation notice..."
                      : "Generating renewal strategy..."}
                  </div>
                ) : (
                  <>
                    <textarea
                      value={actionDraft.draft}
                      onChange={(e) =>
                        setActionDraft({
                          ...actionDraft,
                          draft: e.target.value,
                        })
                      }
                      className="w-full min-h-[100px] rounded-lg border bg-background p-3 text-sm font-mono resize-y focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    {actionDraft.crossVendorContext?.sameVendor &&
                      actionDraft.crossVendorContext.sameVendor.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Related:{" "}
                          {actionDraft.crossVendorContext.sameVendor.length}{" "}
                          other contract
                          {actionDraft.crossVendorContext.sameVendor.length ===
                          1
                            ? ""
                            : "s"}{" "}
                          with this vendor
                        </p>
                      )}
                    {actionDraft.crossVendorContext?.insight && (
                      <p className="text-xs text-amber-700 bg-amber-50 rounded px-2 py-1">
                        {actionDraft.crossVendorContext.insight}
                      </p>
                    )}
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => setActionDraft(null)}>
                        <Check className="w-3 h-3" />
                        Done
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setActionDraft(null)}
                      >
                        <X className="w-3 h-3" />
                        Dismiss
                      </Button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          <Separator />

          {/* Bottom section: Details */}
          <div className="space-y-4">
            <SectionTitle>Details</SectionTitle>
            <div className="space-y-1">
              <Field label="File" value={contract.filename} />
              <Field
                label="Pages"
                value={contract.page_count?.toString() ?? null}
              />
              <Field label="Type" value={contract.contract_type} />
              <Field
                label="Effective"
                value={
                  contract.effective_date
                    ? new Date(contract.effective_date).toLocaleDateString()
                    : null
                }
              />
              <Field
                label="Expires"
                value={
                  contract.expiration_date
                    ? new Date(contract.expiration_date).toLocaleDateString()
                    : null
                }
              />
              <Field
                label="Auto-renewal"
                value={
                  contract.auto_renewal != null
                    ? contract.auto_renewal
                      ? "Yes"
                      : "No"
                    : null
                }
              />
              <Field
                label="Total value"
                value={
                  contract.total_value != null
                    ? `$${contract.total_value.toLocaleString()}`
                    : null
                }
              />
              <Field
                label="Liability cap"
                value={
                  contract.liability_cap != null
                    ? `$${contract.liability_cap.toLocaleString()}`
                    : null
                }
              />
            </div>

            {contract.parties && contract.parties.length > 0 && (
              <div>
                <SectionTitle>Parties</SectionTitle>
                <div className="space-y-1">
                  {contract.parties.map((p) => (
                    <div key={`${p.name}-${p.role}`} className="text-sm">
                      <span className="font-medium text-foreground">
                        {p.name}
                      </span>
                      <span className="text-muted-foreground">
                        {" "}
                        &mdash; {p.role}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {contract.summary && (
              <div>
                <SectionTitle>Summary</SectionTitle>
                <p className="text-sm text-muted-foreground">
                  {contract.summary}
                </p>
              </div>
            )}

            {/* Risk flags inline */}
            {riskFlags.length > 0 && (
              <div>
                <SectionTitle>Risk Flags</SectionTitle>
                <div className="space-y-3">
                  {riskFlags.map((flag) => (
                    <div
                      key={`${flag.clause}-${flag.risk}`}
                      className={cn(
                        "border-l-2 pl-3 space-y-1",
                        flag.severity === "critical" && "border-red-500",
                        flag.severity === "high" && "border-orange-500",
                        flag.severity === "medium" && "border-yellow-500",
                        flag.severity === "low" && "border-green-500",
                      )}
                    >
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {flag.severity} &mdash; {flag.clause}
                      </p>
                      <p className="text-xs italic text-muted-foreground">
                        &ldquo;{flag.quote}&rdquo;
                      </p>
                      <p className="text-xs font-medium">{flag.risk}</p>
                      <p className="text-xs text-muted-foreground">
                        {flag.explanation}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Negotiation points inline */}
            {negotiationPoints.length > 0 && (
              <div>
                <SectionTitle>Negotiation Points</SectionTitle>
                <div className="space-y-3">
                  {negotiationPoints.map((point) => (
                    <div
                      key={point.point}
                      className="border-l-2 border-amber-400 pl-3 space-y-1"
                    >
                      <p className="text-xs font-semibold">{point.point}</p>
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium">Leverage: </span>
                        {point.leverage}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium">Recommendation: </span>
                        {point.recommendation}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Key obligations */}
            {contract.key_obligations &&
              contract.key_obligations.length > 0 && (
                <div>
                  <SectionTitle>Key Obligations</SectionTitle>
                  <ul className="space-y-2">
                    {contract.key_obligations.map((o) => (
                      <li
                        key={`${o.party}-${o.description}`}
                        className="text-sm pl-2 border-l-2 border-primary"
                      >
                        <p className="text-foreground">{o.description}</p>
                        <p className="text-xs mt-0.5 text-muted-foreground">
                          {o.party} &middot; {o.deadline}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

            {/* Termination clauses */}
            {contract.termination_clauses &&
              contract.termination_clauses.length > 0 && (
                <div>
                  <SectionTitle>Termination Clauses</SectionTitle>
                  <ul className="space-y-2">
                    {contract.termination_clauses.map((t) => (
                      <li
                        key={`${t.notice_period}-${t.description}`}
                        className="text-sm pl-2 border-l-2 border-destructive"
                      >
                        <p className="text-foreground">{t.description}</p>
                        <p className="text-xs mt-0.5 text-muted-foreground">
                          Notice: {t.notice_period}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
          </div>
        </div>
      </div>
    </div>
  );
}
