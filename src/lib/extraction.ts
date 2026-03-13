import pdfParse from "pdf-parse";
import { z } from "zod";
import { extractionAgent } from "@/mastra/agents/extractionAgent";

export interface ExtractedContractData {
  title: string | null;
  contract_type: string | null;
  parties: Array<{ name: string; role: string }> | null;
  effective_date: string | null;
  expiration_date: string | null;
  auto_renewal: boolean | null;
  total_value: number | null;
  liability_cap: number | null;
  summary: string | null;
  key_obligations: Array<{
    description: string;
    party: string;
    deadline: string;
  }> | null;
  termination_clauses: Array<{
    description: string;
    notice_period: string;
  }> | null;
  confidence: number;
}

const extractionSchema = z.object({
  title: z.string().nullable(),
  contract_type: z.string().nullable(),
  parties: z.array(z.object({ name: z.string(), role: z.string() })).nullable(),
  effective_date: z.string().nullable(),
  expiration_date: z.string().nullable(),
  auto_renewal: z.boolean().nullable(),
  total_value: z.number().nullable(),
  liability_cap: z.number().nullable(),
  summary: z.string().nullable(),
  key_obligations: z
    .array(
      z.object({
        description: z.string(),
        party: z.string(),
        deadline: z.string(),
      }),
    )
    .nullable(),
  termination_clauses: z
    .array(
      z.object({
        description: z.string(),
        notice_period: z.string(),
      }),
    )
    .nullable(),
  confidence: z.number(),
});

export async function extractTextFromPdf(
  buffer: Buffer,
): Promise<{ text: string; pageCount: number }> {
  const result = await pdfParse(buffer);
  return { text: result.text, pageCount: result.numpages };
}

export async function extractContractData(
  rawText: string,
): Promise<ExtractedContractData> {
  const truncatedText = rawText.slice(0, 12000);

  const prompt = `Analyze this contract text and extract structured data. Return ONLY valid JSON with no markdown, no explanation:
{
  "title": "contract title or null",
  "contract_type": "NDA|SaaS|vendor|employment|partnership|other",
  "parties": [{"name": "party name", "role": "role in contract"}],
  "effective_date": "YYYY-MM-DD or null",
  "expiration_date": "YYYY-MM-DD or null",
  "auto_renewal": true or false or null,
  "total_value": number or null,
  "liability_cap": number or null,
  "summary": "2-3 sentence summary",
  "key_obligations": [{"description": "obligation", "party": "responsible party", "deadline": "deadline or ongoing"}],
  "termination_clauses": [{"description": "termination condition", "notice_period": "notice required"}],
  "confidence": 0.0 to 1.0
}

Contract text:
${truncatedText}`;

  try {
    const result = await extractionAgent.generate(
      [{ role: "user", content: prompt }],
      {
        structuredOutput: { schema: extractionSchema },
      },
    );
    return (result.object ?? fallbackExtraction()) as ExtractedContractData;
  } catch {
    return fallbackExtraction();
  }
}

function fallbackExtraction(): ExtractedContractData {
  return {
    title: null,
    contract_type: null,
    parties: null,
    effective_date: null,
    expiration_date: null,
    auto_renewal: null,
    total_value: null,
    liability_cap: null,
    summary: null,
    key_obligations: null,
    termination_clauses: null,
    confidence: 0,
  };
}
