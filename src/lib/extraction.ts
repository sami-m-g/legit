import { PDFParse } from "pdf-parse";
import { z } from "zod";
import { extractionAgent } from "@/mastra/agents/extractionAgent";

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
  risk_score: z
    .enum(["low", "medium", "high", "critical", "unknown"])
    .default("unknown"),
  risk_flags: z
    .array(
      z.object({
        clause: z.string(),
        quote: z.string(),
        risk: z.string(),
        explanation: z.string(),
        severity: z.enum(["critical", "high", "medium", "low"]),
      }),
    )
    .default([]),
  negotiation_points: z
    .array(
      z.object({
        point: z.string(),
        leverage: z.string(),
        recommendation: z.string(),
      }),
    )
    .default([]),
});

export type ExtractedContractData = z.infer<typeof extractionSchema>;

export async function extractTextFromPdf(
  buffer: Buffer,
): Promise<{ text: string; pageCount: number }> {
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  const result = await parser.getText();
  return { text: result.text, pageCount: result.total };
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
  "confidence": 0.0 to 1.0,
  "risk_score": "low|medium|high|critical|unknown — overall risk assessment for this contract",
  "risk_flags": [{"clause": "clause name/section", "quote": "exact quote from contract", "risk": "short risk label", "explanation": "plain-English what this means for the company", "severity": "critical|high|medium|low"}],
  "negotiation_points": [{"point": "what to negotiate", "leverage": "why you have leverage", "recommendation": "specific recommended action"}]
}

Risk flags to look for: unlimited/uncapped liability, broad indemnification, unilateral price increase rights, auto-renewal with no cancellation window, missing liability caps, vague one-sided termination rights, unfavorable IP/data ownership clauses.

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
    risk_score: "unknown",
    risk_flags: [],
    negotiation_points: [],
  };
}
