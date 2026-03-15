import { initializeDatabase } from "@/lib/db";
import {
  computePortfolioIntelligence,
  getPortfolioRows,
} from "@/lib/portfolio-analysis";

export async function GET() {
  await initializeDatabase();
  const contracts = await getPortfolioRows();
  const intelligence = computePortfolioIntelligence(contracts);
  return Response.json({ intelligence });
}
