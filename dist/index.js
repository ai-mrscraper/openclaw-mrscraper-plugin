import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
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
        api.registerTool(createMrScraperBulkRerunAiScraperTool(api));
        api.registerTool(createMrScraperBulkRerunManualScraperTool(api));
        api.registerTool(createMrScraperFetchHtmlTool(api));
        api.registerTool(createMrScraperGetAllResultsTool(api));
        api.registerTool(createMrScraperGetResultByIdTool(api));
        api.registerTool(createMrScraperGetScreenshotTool(api));
        api.registerTool(createMrScraperRerunAiScraperTool(api));
        api.registerTool(createMrScraperRerunManualScraperTool(api));
        api.registerTool(createMrScraperScrapeTool(api));
        api.registerTool(createMrScraperScrapeBrandTool(api));
        api.registerTool(createMrScraperScrapeJsonTool(api));
        api.registerTool(createMrScraperScrapeMarkdownTool(api));
        api.registerTool(createMrScraperWebSearchTool(api));
    },
});
