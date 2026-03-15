import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { initializeDatabase, sql } from "@/lib/db";
import { extractContractData, extractTextFromPdf } from "@/lib/extraction";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file || file.type !== "application/pdf") {
      return NextResponse.json(
        { error: "A PDF file is required" },
        { status: 400 },
      );
    }

    await initializeDatabase();

    const buffer = Buffer.from(await file.arrayBuffer());

    // Upload to Vercel Blob and extract PDF text concurrently
    const [blob, parsedPdf] = await Promise.all([
      put(file.name, buffer, {
        access: "private",
        contentType: "application/pdf",
      }),
      extractTextFromPdf(buffer).catch(() => null),
    ]);

    // If PDF parsing failed, insert the partial row in one shot
    if (!parsedPdf) {
      const insertResult = await sql`
        INSERT INTO contracts (filename, blob_url, blob_download_url, status, extraction_confidence)
        VALUES (${file.name}, ${blob.url}, ${blob.downloadUrl}, 'partial', 0)
        RETURNING id
      `;
      const contractId = insertResult.rows[0].id as string;
      return NextResponse.json({ id: contractId, status: "partial" });
    }

    // Insert initial row, then update after LLM extraction
    const insertResult = await sql`
      INSERT INTO contracts (filename, blob_url, blob_download_url, status)
      VALUES (${file.name}, ${blob.url}, ${blob.downloadUrl}, 'processing')
      RETURNING id
    `;
    const contractId = insertResult.rows[0].id as string;

    const text = parsedPdf.text;
    const pageCount = parsedPdf.pageCount;
    const extracted = await extractContractData(text);
    const status = extracted.confidence >= 0.1 ? "extracted" : "partial";

    await sql`
      UPDATE contracts SET
        status = ${status},
        raw_text = ${text},
        page_count = ${pageCount},
        title = ${extracted.title},
        contract_type = ${extracted.contract_type},
        parties = ${JSON.stringify(extracted.parties)},
        effective_date = ${extracted.effective_date},
        expiration_date = ${extracted.expiration_date},
        auto_renewal = ${extracted.auto_renewal},
        total_value = ${extracted.total_value},
        liability_cap = ${extracted.liability_cap},
        summary = ${extracted.summary},
        key_obligations = ${JSON.stringify(extracted.key_obligations)},
        termination_clauses = ${JSON.stringify(extracted.termination_clauses)},
        extraction_confidence = ${extracted.confidence},
        risk_score = ${extracted.risk_score},
        risk_flags = ${JSON.stringify(extracted.risk_flags)},
        negotiation_points = ${JSON.stringify(extracted.negotiation_points)},
        updated_at = NOW()
      WHERE id = ${contractId}
    `;

    return NextResponse.json({ id: contractId, status });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
