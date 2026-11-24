import { definePluginEntry, type AnyAgentTool } from "openclaw/plugin-sdk/plugin-entry";
import { createMrScraperBulkRerunAiScraperTool } from "./src/mrscraper-bulk-rerun-ai-scraper-tool.js";
import { createMrScraperBulkRerunManualScraperTool } from "./src/mrscraper-bulk-rerun-manual-scraper-tool.js";
import { createMrScraperWebFetchProvider } from "./src/mrscraper-fetch-provider.js";
import { createMrScraperFetchHtmlTool } from "./src/mrscraper-fetch-tool.js";
import { createMrScraperGetAllResultsTool } from "./src/mrscraper-get-all-results-tool.js";
import { createMrScraperGetResultByIdTool } from "./src/mrscraper-get-result-by-id-tool.js";
import { createMrScraperGetScreenshotTool } from "./src/mrscraper-get-screenshot-tool.js";
import { createMrScraperRerunAiScraperTool } from "./src/mrscraper-rerun-ai-scraper-tool.js";
import { createMrScraperRerunManualScraperTool } from "./src/mrscraper-rerun-manual-scraper-tool.js";
import { createMrScraperScrapeBrandTool } from "./src/mrscraper-scrape-brand-tool.js";
import { createMrScraperScrapeJsonTool } from "./src/mrscraper-scrape-json-tool.js";
import { createMrScraperScrapeMarkdownTool } from "./src/mrscraper-scrape-markdown-tool.js";
import { createMrScraperScrapeTool } from "./src/mrscraper-scrape-tool.js";
import { createMrScraperWebSearchProvider } from "./src/mrscraper-search-provider.js";
import { createMrScraperWebSearchTool } from "./src/mrscraper-web-search-tool.js";

export default definePluginEntry({
  id: "mrscraper",
  name: "MrScraper Plugin",
  description: "MrScraper web fetch, web search, and AI scraping plugin",
  register(api) {
    api.registerWebFetchProvider(createMrScraperWebFetchProvider());
    api.registerWebSearchProvider(createMrScraperWebSearchProvider());
    api.registerTool(createMrScraperBulkRerunAiScraperTool(api) as AnyAgentTool);
    api.registerTool(createMrScraperBulkRerunManualScraperTool(api) as AnyAgentTool);
    api.registerTool(createMrScraperFetchHtmlTool(api) as AnyAgentTool);
    api.registerTool(createMrScraperGetAllResultsTool(api) as AnyAgentTool);
    api.registerTool(createMrScraperGetResultByIdTool(api) as AnyAgentTool);
    api.registerTool(createMrScraperGetScreenshotTool(api) as AnyAgentTool);
    api.registerTool(createMrScraperRerunAiScraperTool(api) as AnyAgentTool);
    api.registerTool(createMrScraperRerunManualScraperTool(api) as AnyAgentTool);
    api.registerTool(createMrScraperScrapeTool(api) as AnyAgentTool);
    api.registerTool(createMrScraperScrapeBrandTool(api) as AnyAgentTool);
    api.registerTool(createMrScraperScrapeJsonTool(api) as AnyAgentTool);
    api.registerTool(createMrScraperScrapeMarkdownTool(api) as AnyAgentTool);
    api.registerTool(createMrScraperWebSearchTool(api) as AnyAgentTool);
  },
});
