import { ConsoleLogger, LogLevel } from "@mastra/core/logger";
import { Mastra } from "@mastra/core/mastra";
import { LibSQLStore } from "@mastra/libsql";
import { contractAgent } from "./agents/contractAgent";
import { extractionAgent } from "./agents/extractionAgent";

export const mastra = new Mastra({
  agents: {
    contractAgent,
    extractionAgent,
  },
  storage: new LibSQLStore({
    id: "mastra-storage",
    url: ":memory:",
  }),
  logger: new ConsoleLogger({
    level: LogLevel.DEBUG,
  }),
});
