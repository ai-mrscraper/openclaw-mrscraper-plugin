import type { OpenClawConfig } from "openclaw/plugin-sdk/config-runtime";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_MRSCRAPER_PLATFORM_BASE_URL,
  DEFAULT_MRSCRAPER_SCRAPE_TIMEOUT_SECONDS,
  DEFAULT_MRSCRAPER_SCRAPER_API_BASE_URL,
  DEFAULT_MRSCRAPER_SEARCH_TIMEOUT_SECONDS,
  resolveMrScraperApiToken,
  resolveMrScraperBlockResources,
  resolveMrScraperFetchBaseUrl,
  resolveMrScraperFetchTimeout,
  resolveMrScraperPlatformBaseUrl,
  resolveMrScraperProxyCountry,
  resolveMrScraperScrapeTimeoutSeconds,
  resolveMrScraperSearchTimeoutSeconds,
} from "./config.js";

const {
  runMrScraperBulkRerunAiScraper,
  runMrScraperBulkRerunManualScraper,
  runMrScraperCreateAiScraper,
  runMrScraperFetchHtml,
  runMrScraperGetAllResults,
  runMrScraperGetResultById,
  runMrScraperRerunAiScraper,
  runMrScraperRerunManualScraper,
  runMrScraperWebSearch,
} = vi.hoisted(() => ({
  runMrScraperBulkRerunAiScraper: vi.fn(async (params: Record<string, unknown>) => params),
  runMrScraperBulkRerunManualScraper: vi.fn(async (params: Record<string, unknown>) => params),
  runMrScraperFetchHtml: vi.fn(async (params: Record<string, unknown>) => params),
  runMrScraperCreateAiScraper: vi.fn(async (params: Record<string, unknown>) => params),
  runMrScraperGetAllResults: vi.fn(async (params: Record<string, unknown>) => params),
  runMrScraperGetResultById: vi.fn(async (params: Record<string, unknown>) => params),
  runMrScraperRerunAiScraper: vi.fn(async (params: Record<string, unknown>) => params),
  runMrScraperRerunManualScraper: vi.fn(async (params: Record<string, unknown>) => params),
  runMrScraperWebSearch: vi.fn(async (params: Record<string, unknown>) => params),
}));

vi.mock("./mrscraper-client.js", async () => {
  const actual =
    await vi.importActual<typeof import("./mrscraper-client.js")>("./mrscraper-client.js");
  return {
    ...actual,
    runMrScraperBulkRerunAiScraper,
    runMrScraperBulkRerunManualScraper,
    runMrScraperFetchHtml,
    runMrScraperCreateAiScraper,
    runMrScraperGetAllResults,
    runMrScraperGetResultById,
    runMrScraperRerunAiScraper,
    runMrScraperRerunManualScraper,
    runMrScraperWebSearch,
  };
});

describe("mrscraper tools", () => {
  let createMrScraperWebFetchProvider: typeof import("./mrscraper-fetch-provider.js").createMrScraperWebFetchProvider;
  let createMrScraperBulkRerunAiScraperTool: typeof import("./mrscraper-bulk-rerun-ai-scraper-tool.js").createMrScraperBulkRerunAiScraperTool;
  let createMrScraperBulkRerunManualScraperTool: typeof import("./mrscraper-bulk-rerun-manual-scraper-tool.js").createMrScraperBulkRerunManualScraperTool;
  let createMrScraperFetchHtmlTool: typeof import("./mrscraper-fetch-tool.js").createMrScraperFetchHtmlTool;
  let createMrScraperGetAllResultsTool: typeof import("./mrscraper-get-all-results-tool.js").createMrScraperGetAllResultsTool;
  let createMrScraperGetResultByIdTool: typeof import("./mrscraper-get-result-by-id-tool.js").createMrScraperGetResultByIdTool;
  let createMrScraperRerunAiScraperTool: typeof import("./mrscraper-rerun-ai-scraper-tool.js").createMrScraperRerunAiScraperTool;
  let createMrScraperRerunManualScraperTool: typeof import("./mrscraper-rerun-manual-scraper-tool.js").createMrScraperRerunManualScraperTool;
  let createMrScraperScrapeTool: typeof import("./mrscraper-scrape-tool.js").createMrScraperScrapeTool;
  let mrscraperClientTesting: typeof import("./mrscraper-client.js").__testing;
  let createMrScraperWebSearchProvider: typeof import("./mrscraper-search-provider.js").createMrScraperWebSearchProvider;
  let createMrScraperWebSearchTool: typeof import("./mrscraper-web-search-tool.js").createMrScraperWebSearchTool;

  beforeAll(async () => {
    ({ createMrScraperBulkRerunAiScraperTool } =
      await import("./mrscraper-bulk-rerun-ai-scraper-tool.js"));
    ({ createMrScraperBulkRerunManualScraperTool } =
      await import("./mrscraper-bulk-rerun-manual-scraper-tool.js"));
    ({ createMrScraperWebFetchProvider } = await import("./mrscraper-fetch-provider.js"));
    ({ createMrScraperFetchHtmlTool } = await import("./mrscraper-fetch-tool.js"));
    ({ createMrScraperGetAllResultsTool } = await import("./mrscraper-get-all-results-tool.js"));
    ({ createMrScraperGetResultByIdTool } = await import("./mrscraper-get-result-by-id-tool.js"));
    ({ createMrScraperRerunAiScraperTool } = await import("./mrscraper-rerun-ai-scraper-tool.js"));
    ({ createMrScraperRerunManualScraperTool } =
      await import("./mrscraper-rerun-manual-scraper-tool.js"));
    ({ createMrScraperScrapeTool } = await import("./mrscraper-scrape-tool.js"));
    ({ createMrScraperWebSearchProvider } = await import("./mrscraper-search-provider.js"));
    ({ createMrScraperWebSearchTool } = await import("./mrscraper-web-search-tool.js"));
    ({ __testing: mrscraperClientTesting } =
      await vi.importActual<typeof import("./mrscraper-client.js")>("./mrscraper-client.js"));
  });

  beforeEach(() => {
    runMrScraperBulkRerunAiScraper.mockReset();
    runMrScraperBulkRerunAiScraper.mockImplementation(
      async (params: Record<string, unknown>) => params,
    );
    runMrScraperBulkRerunManualScraper.mockReset();
    runMrScraperBulkRerunManualScraper.mockImplementation(
      async (params: Record<string, unknown>) => params,
    );
    runMrScraperFetchHtml.mockReset();
    runMrScraperFetchHtml.mockImplementation(async (params: Record<string, unknown>) => params);
    runMrScraperCreateAiScraper.mockReset();
    runMrScraperCreateAiScraper.mockImplementation(
      async (params: Record<string, unknown>) => params,
    );
    runMrScraperGetAllResults.mockReset();
    runMrScraperGetAllResults.mockImplementation(async (params: Record<string, unknown>) => params);
    runMrScraperGetResultById.mockReset();
    runMrScraperGetResultById.mockImplementation(async (params: Record<string, unknown>) => params);
    runMrScraperRerunAiScraper.mockReset();
    runMrScraperRerunAiScraper.mockImplementation(
      async (params: Record<string, unknown>) => params,
    );
    runMrScraperRerunManualScraper.mockReset();
    runMrScraperRerunManualScraper.mockImplementation(
      async (params: Record<string, unknown>) => params,
    );
    runMrScraperWebSearch.mockReset();
    runMrScraperWebSearch.mockImplementation(async (params: Record<string, unknown>) => params);
    vi.unstubAllEnvs();
  });

  it("exposes fetch-provider metadata and enables the plugin", () => {
    const provider = createMrScraperWebFetchProvider();
    if (!provider.applySelectionConfig) {
      throw new Error("Expected applySelectionConfig to be defined");
    }
    const applied = provider.applySelectionConfig({});

    expect(provider.id).toBe("mrscraper");
    expect(provider.credentialPath).toBe("plugins.entries.mrscraper.config.apiToken");
    expect(applied.plugins?.entries?.mrscraper?.enabled).toBe(true);
  });

  it("maps web_fetch provider args into MrScraper fetch params", async () => {
    const provider = createMrScraperWebFetchProvider();
    const tool = provider.createTool({
      config: { test: true },
    } as never);
    if (!tool) {
      throw new Error("Expected tool definition");
    }

    await tool.execute({ url: "https://example.com", maxChars: 1234, extractMode: "text" });
    await tool.execute({ url: "https://example.com/next" });

    expect(runMrScraperFetchHtml).toHaveBeenNthCalledWith(1, {
      cfg: { test: true },
      url: "https://example.com",
      maxChars: 1234,
      extractMode: "text",
    });
    expect(runMrScraperFetchHtml).toHaveBeenNthCalledWith(2, {
      cfg: { test: true },
      url: "https://example.com/next",
      extractMode: "markdown",
    });
  });

  it("stores the web_search credential where the plugin reads it and enables the plugin", () => {
    const provider = createMrScraperWebSearchProvider();
    const config = {} as OpenClawConfig;
    provider.setConfiguredCredentialValue?.(config, "search-token");

    expect(provider.getConfiguredCredentialValue?.(config)).toBe("search-token");
    expect(resolveMrScraperApiToken(config)).toBe("search-token");
    expect(provider.applySelectionConfig?.(config).plugins?.entries?.mrscraper?.enabled).toBe(true);
  });

  it.each([
    [{ count: 3 }, { maxResults: 8 }, 3],
    [{}, { maxResults: 8 }, 8],
    [{}, undefined, 5],
    [{ count: 50 }, undefined, 10],
  ])(
    "resolves the web_search count from args %j and search config %j to %i",
    async (args, searchConfig, count) => {
      const tool = createMrScraperWebSearchProvider().createTool({
        config: { test: true },
        searchConfig,
      } as never);
      if (!tool) {
        throw new Error("Expected tool definition");
      }

      await tool.execute({ query: "mrscraper", ...args });

      expect(runMrScraperWebSearch).toHaveBeenCalledWith(
        expect.objectContaining({ cfg: { test: true }, query: "mrscraper", count }),
      );
    },
  );

  it("passes every Scrape HTML input of the fetch tool to the request, plus maxChars", async () => {
    runMrScraperFetchHtml.mockResolvedValueOnce({ url: "https://example.com", text: "Hello" });
    const tool = createMrScraperFetchHtmlTool({
      config: { env: "test" },
    } as never);

    const result = await tool.execute("call-1", {
      url: "https://example.com",
      browserRendering: true,
      timeout: 60,
      warmStart: false,
      blockResources: true,
      waitForSelector: "#results",
      geoCode: "us",
      maxAge: 3_600_000,
      maxRetries: 1,
      screenshot: "1280x800",
      maxChars: 1500,
    });

    expect(runMrScraperFetchHtml).toHaveBeenCalledWith({
      cfg: { env: "test" },
      url: "https://example.com",
      browserRendering: true,
      timeout: 60,
      warmStart: false,
      blockResources: true,
      waitForSelector: "#results",
      geoCode: "us",
      maxAge: 3_600_000,
      maxRetries: 1,
      screenshot: "1280x800",
      maxChars: 1500,
    });
    expect(result.details).toEqual({ url: "https://example.com", text: "Hello" });
  });

  it("leaves the fetch inputs the caller does not set undefined", async () => {
    const tool = createMrScraperFetchHtmlTool({
      config: { env: "test" },
    } as never);

    await tool.execute("call-1b", { url: "https://example.com", waitForSelector: "  " });

    const [params] = runMrScraperFetchHtml.mock.calls[0] ?? [];
    expect(Object.entries(params ?? {}).filter(([, value]) => value !== undefined)).toEqual([
      ["cfg", { env: "test" }],
      ["url", "https://example.com"],
    ]);
  });

  it("returns a fetch screenshot as an image block after the JSON text", async () => {
    runMrScraperFetchHtml.mockResolvedValueOnce({
      url: "https://example.com",
      text: "Hello",
      screenshot: { data: "iVBORw0KGgo=", mimeType: "image/png" },
    });
    const tool = createMrScraperFetchHtmlTool({
      config: { env: "test" },
    } as never);

    const result = await tool.execute("call-1c", { url: "https://example.com", screenshot: "full" });

    expect(result.content).toEqual([
      { type: "text", text: JSON.stringify({ url: "https://example.com", text: "Hello" }, null, 2) },
      { type: "image", data: "iVBORw0KGgo=", mimeType: "image/png" },
    ]);
    expect(result.details).toEqual({ url: "https://example.com", text: "Hello" });
  });

  it("passes the Web Search inputs of mrscraper_web_search to the request", async () => {
    const tool = createMrScraperWebSearchTool({
      config: { env: "test" },
    } as never);

    await tool.execute("call-1d", { query: "web scraping api", country: "gb", numResults: 20 });

    expect(runMrScraperWebSearch).toHaveBeenCalledWith({
      cfg: { env: "test" },
      query: "web scraping api",
      country: "gb",
      numResults: 20,
    });
  });

  it("normalizes explicit AI scrape parameters", async () => {
    const tool = createMrScraperScrapeTool({
      config: { env: "test" },
    } as never);

    const result = await tool.execute("call-2", {
      url: "https://example.com/catalog",
      message: "Extract names and prices",
      agent: "map",
      proxyCountry: "US",
      maxDepth: 2,
      maxPages: 10,
      limit: 50,
      includePatterns: ".*/products/.*",
      excludePatterns: ".*/cart/.*",
      timeoutSeconds: 90,
    });

    expect(runMrScraperCreateAiScraper).toHaveBeenCalledWith({
      cfg: { env: "test" },
      url: "https://example.com/catalog",
      message: "Extract names and prices",
      agent: "map",
      proxyCountry: "US",
      maxDepth: 2,
      maxPages: 10,
      limit: 50,
      includePatterns: ".*/products/.*",
      excludePatterns: ".*/cart/.*",
      timeoutSeconds: 90,
    });
    expect(result.details).toMatchObject({
      cfg: { env: "test" },
      agent: "map",
    });
  });

  it("normalizes explicit AI rerun parameters", async () => {
    const tool = createMrScraperRerunAiScraperTool({
      config: { env: "test" },
    } as never);

    await tool.execute("call-3", {
      scraperId: "scraper-123",
      url: "https://example.com/catalog/next",
      maxDepth: 3,
      maxPages: 20,
      limit: 100,
      includePatterns: ".*/products/.*",
      excludePatterns: ".*/cart/.*",
      timeoutSeconds: 95,
    });

    expect(runMrScraperRerunAiScraper).toHaveBeenCalledWith({
      cfg: { env: "test" },
      scraperId: "scraper-123",
      url: "https://example.com/catalog/next",
      maxDepth: 3,
      maxPages: 20,
      limit: 100,
      includePatterns: ".*/products/.*",
      excludePatterns: ".*/cart/.*",
      timeoutSeconds: 95,
    });
  });

  it("normalizes explicit AI bulk rerun parameters", async () => {
    const tool = createMrScraperBulkRerunAiScraperTool({
      config: { env: "test" },
    } as never);

    await tool.execute("call-4", {
      scraperId: "scraper-123",
      urls: ["https://example.com/a", "https://example.com/b"],
      timeoutSeconds: 90,
    });

    expect(runMrScraperBulkRerunAiScraper).toHaveBeenCalledWith({
      cfg: { env: "test" },
      scraperId: "scraper-123",
      urls: ["https://example.com/a", "https://example.com/b"],
      timeoutSeconds: 90,
    });
  });

  it("normalizes explicit manual rerun parameters", async () => {
    const tool = createMrScraperRerunManualScraperTool({
      config: { env: "test" },
    } as never);

    await tool.execute("call-5", {
      scraperId: "manual-123",
      url: "https://example.com/manual",
      timeoutSeconds: 80,
    });

    expect(runMrScraperRerunManualScraper).toHaveBeenCalledWith({
      cfg: { env: "test" },
      scraperId: "manual-123",
      url: "https://example.com/manual",
      timeoutSeconds: 80,
    });
  });

  it("normalizes explicit manual bulk rerun parameters", async () => {
    const tool = createMrScraperBulkRerunManualScraperTool({
      config: { env: "test" },
    } as never);

    await tool.execute("call-6", {
      scraperId: "manual-123",
      urls: ["https://example.com/a", "https://example.com/b"],
      timeoutSeconds: 70,
    });

    expect(runMrScraperBulkRerunManualScraper).toHaveBeenCalledWith({
      cfg: { env: "test" },
      scraperId: "manual-123",
      urls: ["https://example.com/a", "https://example.com/b"],
      timeoutSeconds: 70,
    });
  });

  it("normalizes results list parameters", async () => {
    const tool = createMrScraperGetAllResultsTool({
      config: { env: "test" },
    } as never);

    await tool.execute("call-7", {
      sortField: "createdAt",
      sortOrder: "ASC",
      pageSize: 25,
      page: 2,
      search: "laptop",
      dateRangeColumn: "updatedAt",
      startAt: "2026-01-01",
      endAt: "2026-01-31",
      timeoutSeconds: 60,
    });

    expect(runMrScraperGetAllResults).toHaveBeenCalledWith({
      cfg: { env: "test" },
      sortField: "createdAt",
      sortOrder: "ASC",
      pageSize: 25,
      page: 2,
      search: "laptop",
      dateRangeColumn: "updatedAt",
      startAt: "2026-01-01",
      endAt: "2026-01-31",
      timeoutSeconds: 60,
    });
  });

  it("normalizes result-by-id parameters", async () => {
    const tool = createMrScraperGetResultByIdTool({
      config: { env: "test" },
    } as never);

    await tool.execute("call-8", {
      resultId: "result-123",
      timeoutSeconds: 45,
    });

    expect(runMrScraperGetResultById).toHaveBeenCalledWith({
      cfg: { env: "test" },
      resultId: "result-123",
      timeoutSeconds: 45,
    });
  });

  it("prefers plugin config over env defaults and falls back cleanly", () => {
    vi.stubEnv("MRSCRAPER_API_TOKEN", "env-token");

    const cfg = {
      plugins: {
        entries: {
          mrscraper: {
            config: {
              apiToken: "plugin-token",
              webFetch: {
                baseUrl: "https://api.mrscraper.com",
                timeoutSeconds: 75,
                geoCode: "GB",
                blockResources: true,
              },
              platform: {
                baseUrl: "https://api.app.mrscraper.com",
                timeoutSeconds: 150,
                proxyCountry: "SG",
              },
              webSearch: { timeoutSeconds: 45 },
            },
          },
        },
      },
    } as OpenClawConfig;

    expect(resolveMrScraperApiToken(cfg)).toBe("plugin-token");
    expect(resolveMrScraperFetchBaseUrl(cfg)).toBe("https://api.mrscraper.com");
    expect(resolveMrScraperPlatformBaseUrl(cfg)).toBe("https://api.app.mrscraper.com");
    expect(resolveMrScraperFetchTimeout(cfg)).toBe(75);
    expect(resolveMrScraperFetchTimeout(cfg, 30)).toBe(30);
    expect(resolveMrScraperScrapeTimeoutSeconds(cfg)).toBe(150);
    expect(resolveMrScraperProxyCountry(cfg)).toBe("SG");
    expect(resolveMrScraperBlockResources(cfg)).toBe(true);
    expect(resolveMrScraperBlockResources(cfg, false)).toBe(false);
    expect(resolveMrScraperSearchTimeoutSeconds(cfg)).toBe(45);
  });

  it("uses default config values when plugin config is missing", () => {
    vi.stubEnv("MRSCRAPER_API_TOKEN", "env-token");

    expect(resolveMrScraperApiToken()).toBe("env-token");
    expect(resolveMrScraperFetchBaseUrl()).toBe(DEFAULT_MRSCRAPER_SCRAPER_API_BASE_URL);
    expect(resolveMrScraperPlatformBaseUrl()).toBe(DEFAULT_MRSCRAPER_PLATFORM_BASE_URL);
    expect(resolveMrScraperFetchTimeout()).toBeUndefined();
    expect(resolveMrScraperScrapeTimeoutSeconds()).toBe(DEFAULT_MRSCRAPER_SCRAPE_TIMEOUT_SECONDS);
    expect(resolveMrScraperBlockResources()).toBeUndefined();
    expect(resolveMrScraperSearchTimeoutSeconds()).toBe(DEFAULT_MRSCRAPER_SEARCH_TIMEOUT_SECONDS);
  });

  it("extracts useful text from rendered html", () => {
    expect(
      mrscraperClientTesting.htmlToPlainText(
        "<html><head><title>Example</title></head><body><main><h1>Hello</h1><p>World</p></main></body></html>",
      ),
    ).toContain("Hello");
    expect(
      mrscraperClientTesting.extractTitle(
        "<html><head><title>Example &amp; Test</title></head><body></body></html>",
      ),
    ).toBe("Example & Test");
  });

  it("keeps endpoint host allowlists strict", () => {
    expect(
      mrscraperClientTesting.resolveEndpoint({
        baseUrl: "https://api.mrscraper.com",
        defaultBaseUrl: "https://api.mrscraper.com",
        allowedHosts: new Set(["api.mrscraper.com"]),
        product: "MrScraper fetch",
      }),
    ).toBe("https://api.mrscraper.com/");

    expect(() =>
      mrscraperClientTesting.resolveEndpoint({
        baseUrl: "https://evil.example.com",
        defaultBaseUrl: "https://api.mrscraper.com",
        allowedHosts: new Set(["api.mrscraper.com"]),
        product: "MrScraper fetch",
      }),
    ).toThrow("MrScraper fetch baseUrl host is not allowed");
  });
});
