"use client";

import { useCoAgent } from "@copilotkit/react-core";
import { CopilotSidebar } from "@copilotkit/react-ui";
import { useEffect, useState } from "react";
import { BriefingFeed } from "@/components/briefing-feed";
import { ContractList } from "@/components/contract-list";
import { ContractUpload } from "@/components/contract-upload";
import { ContractViewer } from "@/components/contract-viewer";
import { RenewalsTimeline } from "@/components/renewals-timeline";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VendorGroups } from "@/components/vendor-groups";
import type { AgentState, ContractSummary } from "@/lib/types";

export default function ContractIntelligencePage() {
  const [selectedContractId, setSelectedContractId] = useState<string | null>(
    null,
  );
  const [refreshKey, setRefreshKey] = useState(0);
  const [contracts, setContracts] = useState<ContractSummary[]>([]);
  const [seeding, setSeeding] = useState(false);

  const { setState } = useCoAgent<AgentState>({
    name: "contractAgent",
    initialState: { lastSearchResults: [], currentContractId: null },
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

  return (
    <main>
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
        <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                Contract Command Center
              </h1>
              <p className="mt-1 text-muted-foreground">
                Your contracts, prioritized by what needs attention.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSeed}
              disabled={seeding}
              className="shrink-0"
            >
              {seeding ? "Seeding…" : "Load sample data"}
            </Button>
          </div>

          {/* Smart Briefing Feed */}
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wide mb-3 text-primary">
              Today's Briefing
            </h2>
            <BriefingFeed
              onViewContract={handleSelectContract}
              refreshKey={refreshKey}
            />
          </div>

          {/* Upload */}
          <ContractUpload
            onUploadComplete={() => setRefreshKey((k) => k + 1)}
          />

          {/* Lens Tabs */}
          <Tabs defaultValue="all">
            <TabsList className="w-full">
              <TabsTrigger value="all" className="flex-1">
                All Contracts
              </TabsTrigger>
              <TabsTrigger value="renewals" className="flex-1">
                Renewals
              </TabsTrigger>
              <TabsTrigger value="vendors" className="flex-1">
                By Vendor
              </TabsTrigger>
            </TabsList>
            <TabsContent value="all" className="mt-4">
              <ContractList
                onSelect={handleSelectContract}
                refreshKey={refreshKey}
              />
            </TabsContent>
            <TabsContent value="renewals" className="mt-4">
              <RenewalsTimeline
                contracts={contracts}
                onSelect={handleSelectContract}
              />
            </TabsContent>
            <TabsContent value="vendors" className="mt-4">
              <VendorGroups
                contracts={contracts}
                onSelect={handleSelectContract}
              />
            </TabsContent>
          </Tabs>
        </div>
      </CopilotSidebar>
    </main>
  );
}
