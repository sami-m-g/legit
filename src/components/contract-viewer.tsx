"use client";

import { ChevronLeft, Loader2, Pencil, Save, X } from "lucide-react";
import { useEffect, useState } from "react";
import { DraftDialog } from "@/components/draft-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DRAFT_ACTION_LABELS,
  DRAFT_DIALOG_TITLES,
} from "@/lib/draft-constants";
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

function EditableField({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: "text" | "date" | "number";
}) {
  return (
    <div className="flex flex-col gap-1 text-sm">
      <span className="text-muted-foreground text-xs">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded border bg-background px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
      />
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

type EditFormData = {
  title: string;
  contract_type: string;
  effective_date: string;
  expiration_date: string;
  auto_renewal: boolean;
  total_value: string;
  liability_cap: string;
  summary: string;
};

function toDateInput(d: string | null | undefined): string {
  if (!d) return "";
  try {
    return new Date(d).toISOString().split("T")[0];
  } catch {
    return "";
  }
}

export function ContractViewer({ contractId, onBack }: ContractViewerProps) {
  const [contract, setContract] = useState<ContractDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionStatus, setActionStatus] = useState<ActionStatus | null>(null);
  const [actionDraft, setActionDraft] = useState<ActionDraft | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState<EditFormData>({
    title: "",
    contract_type: "",
    effective_date: "",
    expiration_date: "",
    auto_renewal: false,
    total_value: "",
    liability_cap: "",
    summary: "",
  });

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

  function startEditing() {
    if (!contract) return;
    setEditForm({
      title: contract.title ?? "",
      contract_type: contract.contract_type ?? "",
      effective_date: toDateInput(contract.effective_date),
      expiration_date: toDateInput(contract.expiration_date),
      auto_renewal: contract.auto_renewal ?? false,
      total_value: contract.total_value?.toString() ?? "",
      liability_cap: contract.liability_cap?.toString() ?? "",
      summary: contract.summary ?? "",
    });
    setEditing(true);
  }

  async function handleSave() {
    if (!contract) return;
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        title: editForm.title || null,
        contract_type: editForm.contract_type || null,
        effective_date: editForm.effective_date || null,
        expiration_date: editForm.expiration_date || null,
        auto_renewal: editForm.auto_renewal,
        total_value:
          editForm.total_value && !Number.isNaN(Number(editForm.total_value))
            ? Number(editForm.total_value)
            : null,
        liability_cap:
          editForm.liability_cap &&
          !Number.isNaN(Number(editForm.liability_cap))
            ? Number(editForm.liability_cap)
            : null,
        summary: editForm.summary || null,
        extraction_confidence: 1.0,
      };
      const res = await fetch(`/api/contracts/${contractId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const data = await res.json();
        setContract(data.contract);
        setEditing(false);
      }
    } catch (e) {
      console.error("Save failed:", e);
    } finally {
      setSaving(false);
    }
  }

  async function handleExecuteAction(action: BriefingActionType) {
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
    <>
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

          {/* Sidebar */}
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

              {/* Loading indicator for draft generation */}
              {actionDraft?.loading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {DRAFT_ACTION_LABELS[actionDraft.action] ?? "Processing..."}
                </div>
              )}
            </div>

            <Separator />

            {/* Bottom section: Details */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <SectionTitle>Details</SectionTitle>
                {confidenceStatus === "needs-review" && !editing && (
                  <Button size="sm" variant="outline" onClick={startEditing}>
                    <Pencil className="w-3 h-3" />
                    Edit & Verify
                  </Button>
                )}
                {editing && (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSave} disabled={saving}>
                      {saving ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Save className="w-3 h-3" />
                      )}
                      Save & Verify
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditing(false)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                )}
              </div>

              {editing ? (
                <div className="space-y-3">
                  <EditableField
                    label="Title"
                    value={editForm.title}
                    onChange={(v) => setEditForm({ ...editForm, title: v })}
                  />
                  <EditableField
                    label="Contract Type"
                    value={editForm.contract_type}
                    onChange={(v) =>
                      setEditForm({ ...editForm, contract_type: v })
                    }
                  />
                  <EditableField
                    label="Effective Date"
                    value={editForm.effective_date}
                    onChange={(v) =>
                      setEditForm({ ...editForm, effective_date: v })
                    }
                    type="date"
                  />
                  <EditableField
                    label="Expiration Date"
                    value={editForm.expiration_date}
                    onChange={(v) =>
                      setEditForm({ ...editForm, expiration_date: v })
                    }
                    type="date"
                  />
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground text-xs">
                      Auto-renewal
                    </span>
                    <input
                      type="checkbox"
                      checked={editForm.auto_renewal}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          auto_renewal: e.target.checked,
                        })
                      }
                      className="rounded"
                    />
                  </div>
                  <EditableField
                    label="Total Value ($)"
                    value={editForm.total_value}
                    onChange={(v) =>
                      setEditForm({ ...editForm, total_value: v })
                    }
                    type="number"
                  />
                  <EditableField
                    label="Liability Cap ($)"
                    value={editForm.liability_cap}
                    onChange={(v) =>
                      setEditForm({ ...editForm, liability_cap: v })
                    }
                    type="number"
                  />
                  <div className="flex flex-col gap-1 text-sm">
                    <span className="text-muted-foreground text-xs">
                      Summary
                    </span>
                    <textarea
                      value={editForm.summary}
                      onChange={(e) =>
                        setEditForm({ ...editForm, summary: e.target.value })
                      }
                      className="rounded border bg-background px-2 py-1 text-sm min-h-[60px] resize-y focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>
              ) : (
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
                        ? new Date(
                            contract.expiration_date,
                          ).toLocaleDateString()
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
              )}

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

              {contract.summary && !editing && (
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

      {/* Draft Dialog */}
      {actionDraft && (
        <DraftDialog
          open={!actionDraft.loading}
          onOpenChange={(open) => !open && setActionDraft(null)}
          title={DRAFT_DIALOG_TITLES[actionDraft.action] ?? "Draft"}
          subtitle={`${contract.title ?? contract.filename} — Review and edit before confirming.`}
          draft={actionDraft.draft}
          onDraftChange={(text) =>
            setActionDraft({ ...actionDraft, draft: text })
          }
          crossVendorContext={actionDraft.crossVendorContext}
          footer={
            <>
              <Button variant="ghost" onClick={() => setActionDraft(null)}>
                <X className="w-3 h-3" />
                Dismiss
              </Button>
              <Button onClick={() => setActionDraft(null)}>Done</Button>
            </>
          }
        />
      )}
    </>
  );
}
