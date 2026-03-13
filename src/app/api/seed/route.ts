import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { NextResponse } from "next/server";
import { initializeDatabase, sql } from "@/lib/db";
import { extractContractData, extractTextFromPdf } from "@/lib/extraction";
import { SEED_FILENAMES } from "@/lib/sample-data";

export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Not available in production" },
      { status: 403 },
    );
  }

  try {
    await initializeDatabase();
    await sql`DELETE FROM contracts WHERE blob_url LIKE '/contracts/%'`;

    await Promise.all(
      SEED_FILENAMES.map(async (filename) => {
        const pdfPath = join(process.cwd(), "public", "contracts", filename);
        const buffer = await readFile(pdfPath);
        const { text, pageCount } = await extractTextFromPdf(buffer);
        const data = await extractContractData(text);
        const blobUrl = `/contracts/${filename}`;

        await sql`
          INSERT INTO contracts (
            filename, blob_url, blob_download_url, status, title, contract_type,
            parties, effective_date, expiration_date, renewal_date, auto_renewal,
            total_value, liability_cap, extraction_confidence, action_status,
            summary, key_obligations, termination_clauses, page_count
          ) VALUES (
            ${filename}, ${blobUrl}, ${blobUrl}, 'extracted',
            ${data.title}, ${data.contract_type},
            ${data.parties ? JSON.stringify(data.parties) : null}::jsonb,
            ${data.effective_date}::date, ${data.expiration_date}::date,
            ${data.expiration_date}::date, ${data.auto_renewal ?? false},
            ${data.total_value ?? null}, ${data.liability_cap ?? null},
            ${data.confidence}, 'active',
            ${data.summary},
            ${data.key_obligations ? JSON.stringify(data.key_obligations) : null}::jsonb,
            ${data.termination_clauses ? JSON.stringify(data.termination_clauses) : null}::jsonb,
            ${pageCount}
          )
        `;
      }),
    );

    return NextResponse.json({ seeded: SEED_FILENAMES.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Seed error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
