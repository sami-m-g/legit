import { del } from "@vercel/blob";
import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

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
