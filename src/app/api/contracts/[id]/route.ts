import { del } from "@vercel/blob";
import { NextResponse } from "next/server";
import { rawQuery, sql } from "@/lib/db";

const SCALAR_FIELDS = new Set([
  "title",
  "contract_type",
  "auto_renewal",
  "total_value",
  "liability_cap",
  "summary",
  "extraction_confidence",
  "risk_score",
]);
const DATE_FIELDS = new Set(["effective_date", "expiration_date"]);
const JSONB_FIELDS = new Set([
  "parties",
  "key_obligations",
  "termination_clauses",
  "risk_flags",
  "negotiation_points",
]);

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const result = await sql`SELECT * FROM contracts WHERE id = ${id}`;
    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Contract not found" },
        { status: 404 },
      );
    }
    return NextResponse.json({ contract: result.rows[0] });
  } catch (error) {
    console.error("Get contract error:", error);
    return NextResponse.json(
      { error: "Failed to fetch contract" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const setClauses: string[] = [];
    const values: unknown[] = [];
    let paramIdx = 1;

    for (const field of SCALAR_FIELDS) {
      if (field in body) {
        setClauses.push(`${field} = $${paramIdx}`);
        values.push(body[field]);
        paramIdx++;
      }
    }
    for (const field of DATE_FIELDS) {
      if (field in body) {
        setClauses.push(`${field} = $${paramIdx}::date`);
        values.push(body[field]);
        paramIdx++;
      }
    }
    for (const field of JSONB_FIELDS) {
      if (field in body) {
        setClauses.push(`${field} = $${paramIdx}::jsonb`);
        values.push(JSON.stringify(body[field]));
        paramIdx++;
      }
    }

    if (setClauses.length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 },
      );
    }

    setClauses.push("updated_at = NOW()");
    values.push(id);

    const result = await rawQuery(
      `UPDATE contracts SET ${setClauses.join(", ")} WHERE id = $${paramIdx} RETURNING *`,
      values,
    );

    return NextResponse.json({ contract: result.rows[0] });
  } catch (error) {
    console.error("Update contract error:", error);
    return NextResponse.json(
      { error: "Failed to update contract" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const result = await sql`SELECT blob_url FROM contracts WHERE id = ${id}`;
    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Contract not found" },
        { status: 404 },
      );
    }
    const blobUrl = result.rows[0].blob_url as string;
    await del(blobUrl);
    await sql`DELETE FROM contracts WHERE id = ${id}`;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete contract error:", error);
    return NextResponse.json(
      { error: "Failed to delete contract" },
      { status: 500 },
    );
  }
}
