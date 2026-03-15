import { describe, expect, it } from "bun:test";
import type { ContractRow } from "@/lib/briefing-rules";
import { classifyContract } from "@/lib/briefing-rules";

// Pinned "today" so tests are deterministic
const TODAY = new Date("2026-03-13T00:00:00.000Z");

function d(daysFromToday: number): string {
  const dt = new Date(TODAY.getTime() + daysFromToday * 86_400_000);
  return dt.toISOString().split("T")[0];
}

function baseRow(overrides: Partial<ContractRow> = {}): ContractRow {
  return {
    id: "test-id",
    title: "Test Contract",
    filename: "test.pdf",
    auto_renewal: false,
    renewal_date: null,
    expiration_date: d(200),
    liability_cap: null,
    extraction_confidence: 0.95,
    action_status: "active",
    ...overrides,
  };
}

describe("classifyContract — urgent rules", () => {
  it("flags urgent when auto-renewal is within 45 days", () => {
    const item = classifyContract(
      baseRow({ auto_renewal: true, renewal_date: d(30) }),
      TODAY,
    );
    expect(item?.urgency).toBe("urgent");
    expect(item?.reason).toContain("cancellation window closes in 30 days");
    expect(item?.recommendation).toBeTruthy();
    expect(item?.secondaryAction?.label).toBe("Flag for Review");
    expect(item?.secondaryAction?.actionType).toBe("flag");
  });

  it("does NOT flag urgent when auto-renewal is exactly 46 days away", () => {
    const item = classifyContract(
      baseRow({ auto_renewal: true, renewal_date: d(46) }),
      TODAY,
    );
    expect(item?.urgency).not.toBe("urgent");
  });

  it("flags urgent for an expired contract that is still active", () => {
    const item = classifyContract(
      baseRow({ expiration_date: d(-10), action_status: "active" }),
      TODAY,
    );
    expect(item?.urgency).toBe("urgent");
    expect(item?.reason).toContain("10 days ago");
  });

  it("does NOT flag urgent-expired when action_status is not active", () => {
    const item = classifyContract(
      baseRow({ expiration_date: d(-10), action_status: "reviewed" }),
      TODAY,
    );
    expect(item?.urgency).not.toBe("urgent");
  });

  it("flags urgent when liability cap is below $1M", () => {
    const item = classifyContract(baseRow({ liability_cap: 500_000 }), TODAY);
    expect(item?.urgency).toBe("urgent");
    expect(item?.reason).toContain("$500,000");
    expect(item?.reason).toContain("$1,000,000");
    expect(item?.recommendation).toBeTruthy();
  });
});

describe("classifyContract — watch rules", () => {
  it("flags watch when non-auto-renewal contract expires in 60 days", () => {
    const item = classifyContract(
      baseRow({ auto_renewal: false, expiration_date: d(60) }),
      TODAY,
    );
    expect(item?.urgency).toBe("watch");
    expect(item?.reason).toContain("60 days");
  });

  it("flags watch for auto-renewal between 46 and 90 days away", () => {
    const item = classifyContract(
      baseRow({ auto_renewal: true, renewal_date: d(60) }),
      TODAY,
    );
    expect(item?.urgency).toBe("watch");
    expect(item?.reason).toContain("renegotiation window is open");
    expect(item?.secondaryAction?.label).toBe("Flag for Review");
    expect(item?.secondaryAction?.actionType).toBe("flag");
  });

  it("flags watch for low extraction confidence", () => {
    const item = classifyContract(
      baseRow({ extraction_confidence: 0.55 }),
      TODAY,
    );
    expect(item?.urgency).toBe("watch");
    expect(item?.reason).toContain("needs review");
    expect(item?.recommendation).toBeTruthy();
  });

  it("flags watch for flagged action_status", () => {
    const item = classifyContract(baseRow({ action_status: "flagged" }), TODAY);
    expect(item?.urgency).toBe("watch");
    expect(item?.reason).toContain("legal review");
  });
});

describe("classifyContract — info and null cases", () => {
  it("returns info for recently reviewed contracts", () => {
    const item = classifyContract(
      baseRow({ action_status: "reviewed" }),
      TODAY,
    );
    expect(item?.urgency).toBe("info");
  });

  it("returns null for a healthy active contract with no issues", () => {
    const item = classifyContract(baseRow(), TODAY);
    expect(item).toBeNull();
  });

  it("uses filename as title when title is null", () => {
    const item = classifyContract(
      baseRow({ title: null, action_status: "reviewed" }),
      TODAY,
    );
    expect(item?.title).toBe("test.pdf");
  });
});
