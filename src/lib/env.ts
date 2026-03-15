import { z } from "zod";

const envSchema = z.object({
  ollama_model: z
    .string()
    .min(1)
    .optional()
    .default("ollama-cloud/minimax-m2.5"),
  ollama_base_url: z.url().optional().default("https://ollama.com"),
  ollama_api_key: z.string().optional().default(""),
  blob_read_write_token: z.string().optional().default(""),
  postgres_url: z.string().optional().default(""),
});

export const env = envSchema.parse({
  ollama_model: process.env.OLLAMA_MODEL,
  ollama_base_url: process.env.OLLAMA_BASE_URL,
  ollama_api_key: process.env.OLLAMA_API_KEY,
  blob_read_write_token: process.env.BLOB_READ_WRITE_TOKEN,
  postgres_url: process.env.POSTGRES_URL,
});

const missing = [
  !env.postgres_url && "POSTGRES_URL",
  !env.blob_read_write_token && "BLOB_READ_WRITE_TOKEN",
].filter(Boolean);

if (missing.length > 0) {
  console.warn(`⚠ Missing env vars: ${missing.join(", ")}`);
}

export function requireEnv<K extends keyof typeof env>(key: K): string {
  const value = env[key];
  if (!value) throw new Error(`${key.toUpperCase()} is not configured`);
  return value as string;
}
