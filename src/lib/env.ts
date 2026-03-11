import { z } from "zod";

const envSchema = z.object({
  ollama_model: z
    .string()
    .min(1)
    .optional()
    .default("ollama-cloud/minimax-m2.5"),
});

export const env = envSchema.parse({
  ollama_model: process.env.OLLAMA_MODEL,
});
