import { createPool } from "@vercel/postgres";

type Primitive = string | number | boolean | undefined | null;

const pool = createPool({
  connectionString: process.env.POSTGRES_URL,
});

export async function query(
  strings: TemplateStringsArray,
  ...values: Primitive[]
) {
  return await pool.sql(strings, ...values);
}

export const sql = query;

let initialized = false;

export async function initializeDatabase() {
  if (initialized) return;
  await query`
    CREATE TABLE IF NOT EXISTS contracts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      filename TEXT NOT NULL,
      blob_url TEXT NOT NULL,
      blob_download_url TEXT NOT NULL,
      upload_date TIMESTAMPTZ DEFAULT NOW(),
      status TEXT DEFAULT 'processing',
      raw_text TEXT,
      page_count INTEGER,
      title TEXT,
      contract_type TEXT,
      parties JSONB,
      effective_date DATE,
      expiration_date DATE,
      auto_renewal BOOLEAN,
      total_value NUMERIC,
      liability_cap NUMERIC,
      summary TEXT,
      key_obligations JSONB,
      termination_clauses JSONB,
      extraction_confidence REAL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await Promise.all([
    query`CREATE INDEX IF NOT EXISTS contracts_upload_date_idx ON contracts (upload_date DESC)`,
    query`CREATE INDEX IF NOT EXISTS contracts_expiration_date_idx ON contracts (expiration_date ASC)`,
    query`CREATE INDEX IF NOT EXISTS contracts_total_value_idx ON contracts (total_value DESC)`,
    query`CREATE INDEX IF NOT EXISTS contracts_contract_type_idx ON contracts (contract_type)`,
    query`ALTER TABLE contracts ADD COLUMN IF NOT EXISTS action_status TEXT DEFAULT 'active'`,
    query`ALTER TABLE contracts ADD COLUMN IF NOT EXISTS snoozed_until DATE`,
    query`ALTER TABLE contracts ADD COLUMN IF NOT EXISTS renewal_date DATE`,
  ]);
  initialized = true;
}
