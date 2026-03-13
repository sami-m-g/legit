import { describe, expect, it } from "bun:test";
import { daysUntil, futureDateString } from "@/lib/utils";

const TODAY = new Date("2025-01-15T00:00:00.000Z");

describe("daysUntil", () => {
  it("returns 0 when date equals from", () => {
    expect(daysUntil(new Date("2025-01-15T00:00:00.000Z"), TODAY)).toBe(0);
  });

  it("returns positive days for a future date", () => {
    expect(daysUntil(new Date("2025-01-20T00:00:00.000Z"), TODAY)).toBe(5);
  });

  it("returns negative days for a past date", () => {
    expect(daysUntil(new Date("2025-01-10T00:00:00.000Z"), TODAY)).toBe(-5);
  });

  it("rounds up partial days (ceiling)", () => {
    // 1.5 days in the future
    const partial = new Date(TODAY.getTime() + 1.5 * 86_400_000);
    expect(daysUntil(partial, TODAY)).toBe(2);
  });
});

describe("futureDateString", () => {
  it("returns a date string in YYYY-MM-DD format", () => {
    expect(futureDateString(0)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("returns today for 0 days", () => {
    const today = new Date().toISOString().split("T")[0];
    expect(futureDateString(0)).toBe(today);
  });

  it("returns a date 7 days from today", () => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    expect(futureDateString(7)).toBe(d.toISOString().split("T")[0]);
  });
});
