import { NextResponse } from "next/server";
import { initializeDatabase, sql } from "@/lib/db";

export async function GET() {
  try {
    await initializeDatabase();
    const result = await sql`
      SELECT id, filename, title, contract_type, status, upload_date,
             expiration_date, renewal_date, auto_renewal, action_status, snoozed_until, parties
      FROM contracts
      ORDER BY upload_date DESC
      LIMIT 100
    `;
    return NextResponse.json({ contracts: result.rows });
  } catch (error) {
    console.error("List contracts error:", error);
    return NextResponse.json(
      { error: "Failed to fetch contracts" },
      { status: 500 },
    );
  }
}
