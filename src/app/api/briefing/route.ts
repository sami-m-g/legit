import { NextResponse } from "next/server";
import { getBriefingItems } from "@/lib/briefing";
import { initializeDatabase } from "@/lib/db";

export async function GET() {
  try {
    await initializeDatabase();
    const items = await getBriefingItems();
    return NextResponse.json({ items });
  } catch (error) {
    console.error("Briefing error:", error);
    return NextResponse.json(
      { error: "Failed to fetch briefing" },
      { status: 500 },
    );
  }
}
