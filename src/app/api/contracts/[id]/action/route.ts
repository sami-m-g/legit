import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import type { ActionStatus } from "@/lib/types";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = (await request.json()) as { status: ActionStatus };
    const { status } = body;

    const validStatuses: ActionStatus[] = [
      "active",
      "flagged",
      "cancelled",
      "reviewed",
    ];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    await sql`
      UPDATE contracts
      SET action_status = ${status}, snoozed_until = NULL, updated_at = NOW()
      WHERE id = ${id}
    `;

    return NextResponse.json({ success: true, status });
  } catch (error) {
    console.error("Action update error:", error);
    return NextResponse.json(
      { error: "Failed to update action status" },
      { status: 500 },
    );
  }
}
