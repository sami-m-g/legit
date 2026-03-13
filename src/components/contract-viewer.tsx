"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ActionStatus, ContractDetail } from "@/lib/types";
import { futureDateString } from "@/lib/utils";

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

const ACTION_LABELS: Record<ActionStatus, string> = {
  reviewed: "Mark Reviewed",
  flagged: "Flag for Legal",
  cancelled: "Cancel / Terminate",
  snoozed: "Snooze 7 days",
  active: "Mark Active",
};

export function ContractViewer({ contractId, onBack }: ContractViewerProps) {
  const [contract, setContract] = useState<ContractDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionStatus, setActionStatus] = useState<ActionStatus | null>(null);

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
    const body: { status: ActionStatus; snoozed_until?: string } = { status };
    if (status === "snoozed") body.snoozed_until = futureDateString(7);
    const res = await fetch(`/api/contracts/${contractId}/action`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) setActionStatus(status);
  }

  if (loading)
    return <p className="p-4 text-muted-foreground">Loading contract...</p>;
  if (!contract)
    return <p className="p-4 text-destructive">Contract not found.</p>;

  const confidence =
    contract.extraction_confidence != null
      ? Math.round(contract.extraction_confidence * 100)
      : null;

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="flex items-center gap-4 p-4">
          <Button variant="ghost" size="sm" onClick={onBack}>
            ← Back
          </Button>
          <h1 className="font-semibold truncate text-foreground">
            {contract.title ?? contract.filename}
          </h1>
          {confidence != null && (
            <span className="ml-auto text-xs text-muted-foreground">
              Confidence: {confidence}%
            </span>
          )}
        </div>
        <Separator />
        {/* Action bar */}
        <div className="flex items-center gap-2 px-4 py-2 flex-wrap">
          <span className="text-xs mr-1 text-muted-foreground">Actions:</span>
          {(
            ["reviewed", "flagged", "cancelled", "snoozed", "active"] as const
          ).map((s) => (
            <Button
              key={s}
              size="sm"
              variant={actionStatus === s ? "default" : "outline"}
              onClick={() => handleAction(s)}
            >
              {ACTION_LABELS[s]}
            </Button>
          ))}
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

        {/* Summary sidebar */}
        <div className="w-96 overflow-y-auto border-l bg-card">
          {(contract.status === "partial" ||
            contract.status === "processing") && (
            <div className="m-4 rounded-lg p-3 text-sm border bg-primary/5 text-muted-foreground">
              {contract.status === "partial"
                ? "Some fields could not be extracted from this document."
                : "Still processing — check back shortly."}
            </div>
          )}

          <Tabs defaultValue="overview" className="p-4">
            <TabsList className="w-full">
              <TabsTrigger value="overview" className="flex-1">
                Overview
              </TabsTrigger>
              <TabsTrigger value="clauses" className="flex-1">
                Clauses
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4 mt-4">
              <div className="space-y-1">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-primary mb-2">
                  Details
                </h2>
                <Field label="File" value={contract.filename} />
                <Field label="Status" value={contract.status} />
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
                  <h2 className="text-xs font-semibold uppercase tracking-wide text-primary mb-2">
                    Parties
                  </h2>
                  <div className="space-y-1">
                    {contract.parties.map((p) => (
                      <div key={`${p.name}-${p.role}`} className="text-sm">
                        <span className="font-medium text-foreground">
                          {p.name}
                        </span>
                        <span className="text-muted-foreground">
                          {" "}
                          — {p.role}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {contract.summary && (
                <div>
                  <h2 className="text-xs font-semibold uppercase tracking-wide text-primary mb-2">
                    Summary
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {contract.summary}
                  </p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="clauses" className="space-y-4 mt-4">
              {contract.key_obligations &&
              contract.key_obligations.length > 0 ? (
                <div>
                  <h2 className="text-xs font-semibold uppercase tracking-wide text-primary mb-2">
                    Key Obligations
                  </h2>
                  <ul className="space-y-2">
                    {contract.key_obligations.map((o) => (
                      <li
                        key={`${o.party}-${o.description}`}
                        className="text-sm pl-2 border-l-2 border-primary"
                      >
                        <p className="text-foreground">{o.description}</p>
                        <p className="text-xs mt-0.5 text-muted-foreground">
                          {o.party} · {o.deadline}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="text-xs italic text-muted-foreground">
                  No obligations extracted.
                </p>
              )}

              <Separator />

              {contract.termination_clauses &&
              contract.termination_clauses.length > 0 ? (
                <div>
                  <h2 className="text-xs font-semibold uppercase tracking-wide text-primary mb-2">
                    Termination Clauses
                  </h2>
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
              ) : (
                <p className="text-xs italic text-muted-foreground">
                  No termination clauses extracted.
                </p>
              )}

              {confidence != null && (
                <Badge variant="outline" className="text-xs">
                  Extraction confidence: {confidence}%
                </Badge>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
