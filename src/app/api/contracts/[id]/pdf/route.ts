import { head } from "@vercel/blob";
import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { env } from "@/lib/env";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const result = await sql`
      SELECT blob_url, blob_download_url FROM contracts WHERE id = ${id}
    `;
    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Contract not found" },
        { status: 404 },
      );
    }

    const { blob_url, blob_download_url } = result.rows[0] as {
      blob_url: string;
      blob_download_url: string;
    };

    // Local static file (seeded sample contracts served from public/contracts/)
    if (blob_url.startsWith("/")) {
      return NextResponse.redirect(new URL(blob_url, request.url));
    }

    // Use stored downloadUrl; fall back to head() if it has expired
    let downloadUrl = blob_download_url;
    const upstream = await fetch(downloadUrl, {
      headers: {
        Authorization: `Bearer ${env.blob_read_write_token}`,
      },
    });

    if (!upstream.ok) {
      // Stored URL may be expired — refresh via head()
      ({ downloadUrl } = await head(blob_url));
    }

    const response = upstream.ok
      ? upstream
      : await fetch(downloadUrl, {
          headers: {
            Authorization: `Bearer ${env.blob_read_write_token}`,
          },
        });

    if (!response.ok) {
      console.error("Blob fetch failed:", response.status, response.statusText);
      return NextResponse.json(
        { error: "Failed to fetch PDF", status: response.status },
        { status: 502 },
      );
    }

    return new Response(response.body, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": "inline",
      },
    });
  } catch (error) {
    console.error("PDF proxy error:", error);
    return NextResponse.json({ error: "Failed to fetch PDF" }, { status: 500 });
  }
}
