"use client";

import { FileText, Flame, ShieldAlert, Users } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { NarrativeBriefing } from "@/lib/narrative";
import type { PortfolioIntelligence } from "@/lib/types";
import { formatDollarShort } from "@/lib/utils";

interface BriefingNarrativeProps {
  refreshKey: number;
}

type BriefingData = {
  items: unknown[];
  intelligence: PortfolioIntelligence;
  contractCount: number;
};

type PortfolioFlagType = "vendor" | "terms" | "liability" | "risk";

const FLAG_ICONS: Record<
  PortfolioFlagType,
  React.ComponentType<{ className?: string }>
> = {
  vendor: Users,
  terms: FileText,
  liability: ShieldAlert,
  risk: Flame,
};

function StatMetric({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div className="stat-metric">
      <span className="text-xl font-semibold tabular-nums text-foreground">
        {value}
      </span>
      <span className="text-xs text-muted-foreground uppercase tracking-wide">
        {label}
      </span>
      {accent && value > 0 && <span className="stat-metric-accent" />}
    </div>
  );
}

function PortfolioFlagChip({
  label,
  type,
}: {
  label: string;
  type: PortfolioFlagType;
}) {
  const Icon = FLAG_ICONS[type];
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs text-muted-foreground bg-muted/40">
      <Icon className="w-3 h-3 shrink-0 text-primary" />
      {label}
    </span>
  );
}

function getPortfolioFlags(
  intelligence: PortfolioIntelligence,
): Array<{ label: string; type: PortfolioFlagType }> {
  const flags: Array<{ label: string; type: PortfolioFlagType }> = [];
  if (intelligence.vendorDependency.flagged) {
    flags.push({
      label: `Vendor concentration: ${intelligence.vendorDependency.percentage}% with ${intelligence.vendorDependency.vendor}`,
      type: "vendor",
    });
  }
  if (intelligence.termsInconsistency.flagged) {
    const rawMultiplier = Math.round(
      (intelligence.termsInconsistency.range?.max ?? 0) /
        (intelligence.termsInconsistency.range?.min ?? 1),
    );
    const multiplierDisplay = rawMultiplier > 5 ? "5x+" : `${rawMultiplier}x`;
    const rangeDisplay = intelligence.termsInconsistency.range
      ? ` (${formatDollarShort(intelligence.termsInconsistency.range.min)}–${formatDollarShort(intelligence.termsInconsistency.range.max)})`
      : "";
    flags.push({
      label: `Inconsistent ${intelligence.termsInconsistency.type} terms — ${intelligence.termsInconsistency.metric === "liability_cap" ? "liability caps" : "values"} vary ${multiplierDisplay}${rangeDisplay}`,
      type: "terms",
    });
  }
  if (intelligence.liabilityOutlier.flagged) {
    const deviation = intelligence.liabilityOutlier.deviationPct ?? 0;
    const deviationDisplay = deviation > 80 ? "80%+" : `${deviation}%`;
    const capDisplay = intelligence.liabilityOutlier.cap
      ? ` (${formatDollarShort(intelligence.liabilityOutlier.cap)})`
      : "";
    flags.push({
      label: `Liability outlier: ${intelligence.liabilityOutlier.contractTitle}${capDisplay} — ${deviationDisplay} below peer avg`,
      type: "liability",
    });
  }
  if (intelligence.riskHotspot.flagged) {
    flags.push({
      label: `Risk hotspot: ${intelligence.riskHotspot.category} contracts show elevated risk`,
      type: "risk",
    });
  }
  return flags;
}

function parseNarrativeItems(text: string): string[] {
  // Try numbered items first (e.g. "1. Do this thing")
  const numbered = text.match(/\d+\.\s+[^\n]+/g);
  if (numbered && numbered.length >= 2) {
    return numbered.slice(0, 3).map((item) => item.replace(/^\d+\.\s+/, ""));
  }
  // Fallback: split on double newlines, take first 3
  return text
    .split("\n\n")
    .map((p) => p.trim())
    .filter(Boolean)
    .slice(0, 3);
}

export function BriefingNarrative({ refreshKey }: BriefingNarrativeProps) {
  const [data, setData] = useState<BriefingData | null>(null);
  const [narrative, setNarrative] = useState<NarrativeBriefing | null>(null);
  const [narrativeLoading, setNarrativeLoading] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(() => {
    setLoading(true);
    setNarrativeLoading(true);
    const briefingReq = fetch("/api/briefing").then((r) => r.json());
    const narrativeReq = fetch("/api/briefing/narrative").then((r) => r.json());
    briefingReq
      .then((d: BriefingData) => {
        setData(d);
        setLoading(false);
      })
      .catch((e) => {
        console.error(e);
        setLoading(false);
      });
    narrativeReq
      .then((n: NarrativeBriefing) => setNarrative(n))
      .catch(console.error)
      .finally(() => setNarrativeLoading(false));
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: refreshKey is an intentional trigger
  useEffect(() => {
    fetchData();
  }, [refreshKey, fetchData]);

  if (!loading && (!data || data.contractCount === 0)) {
    return (
      <Card className="px-5 py-4 text-center">
        <p className="text-sm text-muted-foreground">
          Upload contracts to generate your portfolio overview.
        </p>
      </Card>
    );
  }

  const urgentCount = loading
    ? 0
    : (narrative?.stats.urgentCount ??
      (data?.items as Array<{ urgency: string }>).filter(
        (i) => i.urgency === "urgent",
      ).length);
  const watchCount = loading
    ? 0
    : (narrative?.stats.watchCount ??
      (data?.items as Array<{ urgency: string }>).filter(
        (i) => i.urgency === "watch",
      ).length);
  const flags = data ? getPortfolioFlags(data.intelligence) : [];

  return (
    <Card className="px-5 py-3 space-y-2 overflow-hidden">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-primary">
        Portfolio Overview
      </h2>

      {/* Stat metrics — editorial grid */}
      <div className="grid grid-cols-4 gap-3">
        {loading ? (
          ["contracts", "urgent", "watch", "flags"].map((key) => (
            <div key={key} className="stat-metric">
              <Skeleton className="h-6 w-10" />
              <Skeleton className="h-3 w-14 mt-1" />
            </div>
          ))
        ) : (
          <>
            <StatMetric label="Contracts" value={data?.contractCount ?? 0} />
            <StatMetric label="Urgent" value={urgentCount} accent />
            <StatMetric label="Watch" value={watchCount} />
            <StatMetric label="Flags" value={flags.length} />
          </>
        )}
      </div>

      {/* Portfolio flag chips — unified muted style */}
      {flags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {flags.map((flag) => (
            <PortfolioFlagChip
              key={flag.label}
              label={flag.label}
              type={flag.type}
            />
          ))}
        </div>
      )}

      {/* Narrative — numbered priorities */}
      {loading || narrativeLoading ? (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground animate-pulse">
            {loading ? "Loading portfolio data..." : "Generating briefing..."}
          </p>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/6" />
        </div>
      ) : narrative?.narrative ? (
        <ol className="list-decimal list-inside space-y-0.5 text-sm text-muted-foreground">
          {parseNarrativeItems(narrative.narrative).map((item, i) => (
            <li key={`${i}-${item.slice(0, 20)}`}>{item}</li>
          ))}
        </ol>
      ) : null}
    </Card>
  );
}
