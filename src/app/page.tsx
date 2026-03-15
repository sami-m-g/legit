"use client";

import { useCoAgent, useCopilotReadable } from "@copilotkit/react-core";
import {
  CopilotSidebar,
  useCopilotChatSuggestions,
} from "@copilotkit/react-ui";
import { Database, FileText, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { BriefingFeed } from "@/components/briefing-feed";
import { BriefingNarrative } from "@/components/briefing-narrative";
import { ContractList } from "@/components/contract-list";
import { ContractUpload } from "@/components/contract-upload";
import { ContractViewer } from "@/components/contract-viewer";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { AgentState, ContractSummary } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function ContractIntelligencePage() {
  const [selectedContractId, setSelectedContractId] = useState<string | null>(
    null,
  );
  const [refreshKey, setRefreshKey] = useState(0);
  const [contracts, setContracts] = useState<ContractSummary[]>([]);
  const [seeding, setSeeding] = useState(false);
  const [activePage, setActivePage] = useState<"action-center" | "contracts">(
    "action-center",
  );

  const { setState } = useCoAgent<AgentState>({
    name: "contractAgent",
    initialState: { lastSearchResults: [], currentContractId: null },
  });

  useCopilotReadable({
    description: "The user's contract portfolio overview",
    value: {
      contractCount: contracts.length,
      view: selectedContractId ? "contract-detail" : "dashboard",
    },
  });

  useCopilotChatSuggestions({
    instructions: selectedContractId
      ? "The user is viewing a specific contract. Suggest 3-4 focused questions about that contract's risks, terms, obligations, and renewal options."
      : "The user is on the contract dashboard. Suggest 3-4 questions about portfolio health, upcoming renewals, risk exposure, and vendor relationships.",
    minSuggestions: 3,
    maxSuggestions: 4,
  });

  // biome-ignore lint/correctness/useExhaustiveDependencies: refreshKey is an intentional trigger
  useEffect(() => {
    fetch("/api/contracts/list")
      .then((r) => r.json())
      .then((data: { contracts: ContractSummary[] }) =>
        setContracts(data.contracts ?? []),
      )
      .catch(console.error);
  }, [refreshKey]);

  function handleSelectContract(id: string) {
    setSelectedContractId(id);
    setState((prev) => ({
      lastSearchResults: prev?.lastSearchResults ?? [],
      currentContractId: id,
    }));
  }

  function handleBack() {
    setSelectedContractId(null);
    setRefreshKey((k) => k + 1);
    setState((prev) => ({
      lastSearchResults: prev?.lastSearchResults ?? [],
      currentContractId: null,
    }));
  }

  async function handleSeed() {
    setSeeding(true);
    try {
      const res = await fetch("/api/seed", { method: "POST" });
      const data = (await res.json()) as { seeded?: number; error?: string };
      if (data.error) console.error("Seed failed:", data.error);
      else if (data.seeded) setRefreshKey((k) => k + 1);
    } finally {
      setSeeding(false);
    }
  }

  const contractTitle =
    contracts.find((c) => c.id === selectedContractId)?.title ?? null;

  if (selectedContractId) {
    return (
      <main>
        <CopilotSidebar
          disableSystemMessage={true}
          clickOutsideToClose={false}
          labels={{
            title: "Contract Assistant",
            initial: contractTitle
              ? `Reviewing "${contractTitle}". Ask me about obligations, dates, risks, or termination options.`
              : "Ask me about this contract — obligations, dates, or risks.",
          }}
          suggestions={[
            {
              title: "Termination options",
              message: "What are my termination options for this contract?",
            },
            {
              title: "Key obligations",
              message: "What are the key obligations in this contract?",
            },
            {
              title: "Risks",
              message: "What are the main risks in this contract?",
            },
            {
              title: "Compare",
              message:
                "How does this contract compare to similar ones in the portfolio?",
            },
          ]}
        >
          <ContractViewer contractId={selectedContractId} onBack={handleBack} />
        </CopilotSidebar>
      </main>
    );
  }

  const pageTitle =
    activePage === "action-center" ? "Action Center" : "Contracts";

  return (
    <main className="flex h-screen overflow-hidden">
      <CopilotSidebar
        disableSystemMessage={true}
        clickOutsideToClose={false}
        labels={{
          title: "Contract Assistant",
          initial:
            "Ask me about your contracts — renewals, expiries, obligations, or risks.",
        }}
        suggestions={[
          {
            title: "Upcoming renewals",
            message: "What contracts are up for renewal in the next 90 days?",
          },
          {
            title: "High-value contracts",
            message: "Show me all contracts with total value over $100K.",
          },
          { title: "Expiring NDAs", message: "Which NDAs expire this year?" },
          {
            title: "Risk summary",
            message: "Which contracts have low liability caps?",
          },
        ]}
      >
        <div className="flex h-full w-full">
          {/* Left sidebar */}
          <aside className="app-sidebar flex flex-col h-full shrink-0">
            {/* Branding */}
            <div className="px-5 pt-5 pb-4">
              <h1 className="font-display text-lg font-semibold tracking-tight text-[var(--on-gold)]">
                Legit Counsel
              </h1>
              <p className="text-xs text-[var(--sidebar-text)] mt-0.5">
                {new Date().toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 space-y-1">
              <button
                type="button"
                onClick={() => setActivePage("action-center")}
                className={cn(
                  "sidebar-nav-item",
                  activePage === "action-center" && "sidebar-nav-item-active",
                )}
              >
                <Zap className="w-4 h-4 shrink-0" />
                Action Center
              </button>
              <button
                type="button"
                onClick={() => setActivePage("contracts")}
                className={cn(
                  "sidebar-nav-item",
                  activePage === "contracts" && "sidebar-nav-item-active",
                )}
              >
                <FileText className="w-4 h-4 shrink-0" />
                Contracts
              </button>
            </nav>

            {/* Seed button */}
            <div className="px-3 pb-4">
              <Separator className="mb-3 bg-[var(--sidebar-border)]" />
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSeed}
                disabled={seeding}
                className="w-full justify-start gap-2 text-[var(--sidebar-text)] hover:text-[var(--on-gold)] hover:bg-[var(--sidebar-hover)]"
              >
                <Database className="w-4 h-4 shrink-0" />
                {seeding ? "Seeding\u2026" : "Load sample data"}
              </Button>
            </div>
          </aside>

          {/* Content area */}
          <div className="flex flex-col flex-1 min-w-0 min-h-0 overflow-hidden">
            <header className="px-8 pt-6 pb-4 shrink-0">
              <h2 className="font-display text-xl font-semibold tracking-tight text-foreground">
                {pageTitle}
              </h2>
            </header>
            {/* Action Center page */}
            <div
              className={cn(
                "flex flex-col flex-1 min-h-0",
                activePage !== "action-center" && "hidden",
              )}
            >
              {/* Briefing — pinned to top */}
              <div className="px-8 pb-4 shrink-0">
                <BriefingNarrative refreshKey={refreshKey} />
              </div>
              {/* Feed — scrollable, no visible scrollbar */}
              <div className="flex-1 overflow-y-auto scrollbar-hide px-8 pb-8">
                <BriefingFeed
                  onViewContract={handleSelectContract}
                  refreshKey={refreshKey}
                  onRefreshNeeded={() => setRefreshKey((k) => k + 1)}
                />
              </div>
            </div>
            {/* Contracts page */}
            <div
              className={cn(
                "flex-1 overflow-y-auto scrollbar-hide px-8 pb-8",
                activePage !== "contracts" && "hidden",
              )}
            >
              <div className="space-y-6">
                <ContractUpload
                  onUploadComplete={() => setRefreshKey((k) => k + 1)}
                />
                <ContractList
                  onSelect={handleSelectContract}
                  refreshKey={refreshKey}
                />
              </div>
            </div>
          </div>
        </div>
      </CopilotSidebar>
    </main>
  );
}
