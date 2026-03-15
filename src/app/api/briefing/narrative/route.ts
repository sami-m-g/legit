import { getBriefingItems } from "@/lib/briefing";
import { initializeDatabase } from "@/lib/db";
import { generateNarrativeBriefing } from "@/lib/narrative";
import {
  computePortfolioIntelligence,
  getPortfolioRows,
} from "@/lib/portfolio-analysis";

export async function GET() {
  try {
    await initializeDatabase();

    const [items, portfolioRows] = await Promise.all([
      getBriefingItems(),
      getPortfolioRows(),
    ]);

    const intelligence = computePortfolioIntelligence(portfolioRows);
    const briefing = await generateNarrativeBriefing(
      items,
      intelligence,
      portfolioRows.length,
    );

    return Response.json(briefing);
  } catch (error) {
    console.error("Narrative briefing error:", error);
    return Response.json(
      { error: "Failed to generate narrative" },
      { status: 500 },
    );
  }
}
