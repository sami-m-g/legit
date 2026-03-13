import { z } from "zod";

const envSchema = z.object({
  ollama_model: z
    .string()
    .min(1)
    .optional()
    .default("ollama-cloud/minimax-m2.5"),
  ollama_base_url: z.url().optional().default("https://ollama.com"),
  ollama_api_key: z.string().optional().default(""),
  blob_read_write_token: z.string().min(1),
  postgres_url: z.string().min(1),
});

export const env = envSchema.parse({
  ollama_model: process.env.OLLAMA_MODEL,
  ollama_base_url: process.env.OLLAMA_BASE_URL,
  ollama_api_key: process.env.OLLAMA_API_KEY,
  blob_read_write_token: process.env.BLOB_READ_WRITE_TOKEN,
  postgres_url: process.env.POSTGRES_URL,
});
