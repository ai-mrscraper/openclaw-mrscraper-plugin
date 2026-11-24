import type { OpenClawConfig } from "openclaw/plugin-sdk/config-runtime";
import TurndownService from "turndown";
import {
  readResponseText,
  resolveTimeoutSeconds,
  withStrictWebToolsEndpoint,
  wrapExternalContent,
  wrapWebContent,
} from "openclaw/plugin-sdk/provider-web-fetch";
import { normalizeSecretInput } from "openclaw/plugin-sdk/secret-input";
import {
  DEFAULT_MRSCRAPER_SCRAPER_API_BASE_URL,
  resolveMrScraperApiToken,
  resolveMrScraperBlockResources,
  resolveMrScraperFetchBaseUrl,
  resolveMrScraperFetchTimeout,
  resolveMrScraperGeoCode,
  resolveMrScraperPlatformBaseUrl,
  resolveMrScraperProxyCountry,
  resolveMrScraperScrapeTimeoutSeconds,
  resolveMrScraperSearchCountry,
  resolveMrScraperSearchTimeoutSeconds,
} from "./config.js";

const ALLOWED_SCRAPER_API_HOSTS = new Set(["api.mrscraper.com"]);
const ALLOWED_PLATFORM_HOSTS = new Set(["api.app.mrscraper.com"]);
const DEFAULT_FETCH_MAX_CHARS = 50_000;
const MAX_PAGE_RESPONSE_BYTES = 5_000_000;
// A screenshot arrives as base64 image data, next to the HTML when there is any.
const MAX_SCREENSHOT_RESPONSE_BYTES = 25_000_000;
const MAX_PLATFORM_RESPONSE_BYTES = 5_000_000;
const MAX_ERROR_RESPONSE_BYTES = 64_000;
const MAX_ERROR_DETAIL_CHARS = 1_000;
const MAX_SEARCH_RESPONSE_BYTES = 1_000_000;
// The API scrapes for up to 300 seconds when no timeout is sent; the HTTP deadline adds 30.
const DEFAULT_PAGE_TIMEOUT_SECONDS = 300;
const PAGE_DEADLINE_MARGIN_SECONDS = 30;
const MAX_PAGE_TIMEOUT_SECONDS = 330;
const BRAND_TIMEOUT_SECONDS = 120;
// maxAge accepts up to 7 days, in milliseconds.
const MAX_AGE_MS = 604_800_000;
const MAX_WAIT_FOR_SELECTOR_CHARS = 500;
const MAX_SEARCH_QUERY_CHARS = 1_000;
const MIN_SEARCH_RESULTS = 10;
const MAX_SEARCH_RESULTS = 100;
// The API edge refuses longer request URLs, so a longer Scrape JSON request goes by POST.
const MAX_GET_URL_CHARS = 8_000;
const COUNTRY_CODE_PATTERN = /^[a-z]{2}$/i;
// full, top, or <width>x<height> with an optional -<zoom> percent.
const SCREENSHOT_PATTERN = /^(full|top|[0-9]{3,4}x[0-9]{3,4}(-[0-9]{2,3})?)$/;
const SCRAPER_API_ENDPOINT = `${DEFAULT_MRSCRAPER_SCRAPER_API_BASE_URL}/`;

/** Page inputs from the MrScraper API docs. Each is sent only when set; maxAge is 0 unless set. */
export type MrScraperPageParams = {
  cfg?: OpenClawConfig;
  url: string;
  browserRendering?: boolean;
  timeout?: number;
  warmStart?: boolean;
  blockResources?: boolean;
  waitForSelector?: string;
  geoCode?: string;
  maxAge?: number;
  maxRetries?: number;
  signal?: AbortSignal;
};

export type MrScraperFetchHtmlParams = MrScraperPageParams & {
  screenshot?: string;
  maxChars?: number;
  extractMode?: "markdown" | "text";
};

export type MrScraperScrapeMarkdownParams = MrScraperPageParams;

export type MrScraperGetScreenshotParams = Omit<
  MrScraperPageParams,
  "browserRendering" | "warmStart" | "blockResources"
> & {
  /** full (the default), top, or <width>x<height> with an optional -<zoom>. */
  screenshot?: string;
};

export type MrScraperScrapeBrandParams = {
  cfg?: OpenClawConfig;
  url: string;
  signal?: AbortSignal;
};

export type MrScraperScrapeJsonParams = MrScraperPageParams & {
  prompt?: string;
  /** Defaults to true. */
  html?: boolean;
  /** Defaults to false. */
  screenshot?: boolean;
};

/** A page screenshot: base64 image data and its media type. */
export type MrScraperScreenshot = { data: string; mimeType: string };

export type MrScraperWebSearchParams = {
  cfg?: OpenClawConfig;
  query: string;
  country?: string;
  /** Results to ask the API for, 10 to 100. Unset leaves the API default of 10. */
  numResults?: number;
  /** Results to keep from the response. */
  count?: number;
  signal?: AbortSignal;
};

export type MrScraperCreateAiScraperParams = {
  cfg?: OpenClawConfig;
  url: string;
  message: string;
  agent?: "general" | "listing" | "map";
  proxyCountry?: string;
  maxDepth?: number;
  maxPages?: number;
  limit?: number;
  includePatterns?: string;
  excludePatterns?: string;
  timeoutSeconds?: number;
};

export type MrScraperRerunAiScraperParams = {
  cfg?: OpenClawConfig;
  scraperId: string;
  url: string;
  maxDepth?: number;
  maxPages?: number;
  limit?: number;
  includePatterns?: string;
  excludePatterns?: string;
  timeoutSeconds?: number;
};

export type MrScraperBulkRerunAiScraperParams = {
  cfg?: OpenClawConfig;
  scraperId: string;
  urls: string[];
  timeoutSeconds?: number;
};

export type MrScraperRerunManualScraperParams = {
  cfg?: OpenClawConfig;
  scraperId: string;
  url: string;
  timeoutSeconds?: number;
};

export type MrScraperBulkRerunManualScraperParams = {
  cfg?: OpenClawConfig;
  scraperId: string;
  urls: string[];
  timeoutSeconds?: number;
};

export type MrScraperGetAllResultsParams = {
  cfg?: OpenClawConfig;
  sortField?:
    | "createdAt"
    | "updatedAt"
    | "id"
    | "type"
    | "url"
    | "status"
    | "error"
    | "tokenUsage"
    | "runtime";
  sortOrder?: "ASC" | "DESC";
  pageSize?: number;
  page?: number;
  search?: string;
  dateRangeColumn?: string;
  startAt?: string;
  endAt?: string;
  timeoutSeconds?: number;
};

export type MrScraperGetResultByIdParams = {
  cfg?: OpenClawConfig;
  resultId: string;
  timeoutSeconds?: number;
};

function resolveEndpoint(params: {
  baseUrl: string;
  defaultBaseUrl: string;
  pathname?: string;
  allowedHosts: Set<string>;
  product: string;
}): string {
  const candidate = params.baseUrl.trim() || params.defaultBaseUrl;
  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    url = new URL(params.defaultBaseUrl);
  }
  if (url.protocol !== "https:") {
    throw new Error(`${params.product} baseUrl must use https.`);
  }
  if (!params.allowedHosts.has(url.hostname)) {
    throw new Error(`${params.product} baseUrl host is not allowed: ${url.hostname}`);
  }
  url.username = "";
  url.password = "";
  url.search = "";
  url.hash = "";
  if (params.pathname) {
    url.pathname = params.pathname;
  }
  return url.toString();
}

async function throwHttpError(response: Response, label: string): Promise<never> {
  let detail =
    typeof response.statusText === "string" && response.statusText.trim()
      ? response.statusText.trim()
      : "request failed";

  const errorBody = await readResponseText(response, { maxBytes: MAX_ERROR_RESPONSE_BYTES });
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json") && !errorBody.truncated) {
    try {
      const payload: unknown = JSON.parse(errorBody.text);
      const record =
        payload && typeof payload === "object" && !Array.isArray(payload)
          ? (payload as Record<string, unknown>)
          : undefined;
      detail =
        typeof record?.message === "string"
          ? record.message
          : typeof record?.error === "string"
            ? record.error
            : detail;
    } catch {
      // Keep the status text when the bounded error body is not valid JSON.
    }
  } else if (errorBody.text) {
    detail = errorBody.text;
  }

  throw new Error(
    `${label} API error (${response.status}): ${wrapWebContent(detail.slice(0, MAX_ERROR_DETAIL_CHARS), "web_fetch")}`,
  );
}

async function readBoundedResponse(response: Response, maxBytes: number, label: string): Promise<string> {
  const result = await readResponseText(response, { maxBytes });
  if (result.truncated) {
    throw new Error(`${label} response exceeds the ${maxBytes}-byte limit.`);
  }
  return result.text;
}

function buildPlatformHeaders(apiToken: string): Record<string, string> {
  return {
    accept: "application/json",
    "content-type": "application/json",
    "x-api-token": normalizeSecretInput(apiToken),
  };
}

function resolvePlatformEndpoint(pathname: string, cfg?: OpenClawConfig): string {
  return resolveEndpoint({
    baseUrl: resolveMrScraperPlatformBaseUrl(cfg),
    defaultBaseUrl: "https://api.app.mrscraper.com",
    pathname,
    allowedHosts: ALLOWED_PLATFORM_HOSTS,
    product: "MrScraper platform",
  });
}

function resolvePlatformTimeoutSeconds(cfg?: OpenClawConfig, override?: number): number {
  return resolveTimeoutSeconds(override, resolveMrScraperScrapeTimeoutSeconds(cfg));
}

async function runPlatformJsonRequest(params: {
  cfg?: OpenClawConfig;
  apiToken: string;
  endpoint: string;
  timeoutSeconds?: number;
  init?: RequestInit;
  label: string;
}): Promise<Record<string, unknown>> {
  const timeoutSeconds = resolvePlatformTimeoutSeconds(params.cfg, params.timeoutSeconds);
  return await withStrictWebToolsEndpoint(
    {
      url: params.endpoint,
      timeoutSeconds,
      init: params.init,
    },
    async ({ response }) => {
      if (!response.ok) {
        await throwHttpError(response, params.label);
      }
      const body = await readBoundedResponse(response, MAX_PLATFORM_RESPONSE_BYTES, params.label);
      const payload: unknown = JSON.parse(body);
      if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
        throw new Error(`${params.label} response must be a JSON object.`);
      }
      return payload as Record<string, unknown>;
    },
  );
}

function requireMrScraperApiToken(cfg: OpenClawConfig | undefined, consumer: string): string {
  const apiToken = resolveMrScraperApiToken(cfg);
  if (!apiToken) {
    throw new Error(
      `${consumer} needs a MrScraper API token. Set MRSCRAPER_API_TOKEN in the Gateway environment, or configure plugins.entries.mrscraper.config.apiToken.`,
    );
  }
  return apiToken;
}

function extractTitle(html: string): string | undefined {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!match?.[1]) {
    return undefined;
  }
  return decodeHtmlEntities(match[1]).trim() || undefined;
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}

function htmlToPlainText(html: string): string {
  return decodeHtmlEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<\/(p|div|section|article|main|header|footer|aside|li|tr|h[1-6])>/gi, "\n")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/\r/g, "")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/[ \t]{2,}/g, " ")
      .trim(),
  );
}

function normalizeMaxChars(maxChars?: number): number {
  if (typeof maxChars === "number" && Number.isFinite(maxChars) && maxChars > 0) {
    return Math.floor(maxChars);
  }
  return DEFAULT_FETCH_MAX_CHARS;
}

function truncate(value: string, maxChars: number): { text: string; truncated: boolean } {
  if (value.length <= maxChars) {
    return { text: value, truncated: false };
  }
  return {
    text: value.slice(0, Math.max(0, maxChars - 1)).trimEnd(),
    truncated: true,
  };
}

function pageUrlInput(name: string, value: string): string {
  let parsed: URL | undefined;
  try {
    parsed = new URL(value);
  } catch {
    // Reported below.
  }
  if (!parsed || (parsed.protocol !== "http:" && parsed.protocol !== "https:")) {
    throw new Error(
      `MrScraper ${name} url must be an absolute HTTP or HTTPS URL that includes the protocol, such as https://example.com.`,
    );
  }
  return value;
}

function integerInput(name: string, value: number, min: number, max?: number): number {
  if (!Number.isSafeInteger(value) || value < min || (max !== undefined && value > max)) {
    throw new Error(
      max === undefined
        ? `MrScraper ${name} must be an integer of at least ${min}.`
        : `MrScraper ${name} must be an integer from ${min} to ${max}.`,
    );
  }
  return value;
}

function countryCodeInput(name: string, value: string): string {
  if (!COUNTRY_CODE_PATTERN.test(value)) {
    throw new Error(`MrScraper ${name} must be a two-letter code such as us or gb, not "${value}".`);
  }
  return value.toLowerCase();
}

function waitForSelectorInput(name: string, value: string): string {
  const selector = value.trim();
  if (!selector || [...selector].length > MAX_WAIT_FOR_SELECTOR_CHARS) {
    throw new Error(
      `MrScraper ${name} waitForSelector must be 1 to ${MAX_WAIT_FOR_SELECTOR_CHARS} characters.`,
    );
  }
  return selector;
}

function isScreenshotArea(value: string): boolean {
  if (!SCREENSHOT_PATTERN.test(value)) {
    return false;
  }
  if (value === "full" || value === "top") {
    return true;
  }
  const [size = "", zoom] = value.split("-");
  const [width = 0, height = 0] = size.split("x").map(Number);
  const within = (number: number, min: number, max: number) => number >= min && number <= max;
  return (
    within(width, 100, 3840) &&
    within(height, 100, 3840) &&
    (zoom === undefined || within(Number(zoom), 25, 300))
  );
}

function screenshotInput(name: string, value: string): string {
  if (!isScreenshotArea(value)) {
    throw new Error(
      `MrScraper ${name} screenshot must be full, top, or <width>x<height> with an optional -<zoom>, such as 1280x800 or 1920x1080-75 (width and height 100 to 3840, zoom 25 to 300).`,
    );
  }
  return value;
}

// Validated page inputs. Each one is undefined when unset, so it is not sent and the API default
// applies, except maxAge, which is 0 (always scrape fresh) unless set.
function pageInputs(name: string, params: MrScraperPageParams) {
  return {
    url: pageUrlInput(name, params.url),
    browserRendering: params.browserRendering,
    timeout:
      params.timeout === undefined
        ? undefined
        : integerInput(`${name} timeout`, params.timeout, 1, MAX_PAGE_TIMEOUT_SECONDS),
    warmStart: params.warmStart,
    blockResources: params.blockResources,
    waitForSelector:
      params.waitForSelector === undefined
        ? undefined
        : waitForSelectorInput(name, params.waitForSelector),
    geoCode:
      params.geoCode === undefined ? undefined : countryCodeInput(`${name} geoCode`, params.geoCode),
    maxAge: integerInput(`${name} maxAge`, params.maxAge ?? 0, 0, MAX_AGE_MS),
    maxRetries:
      params.maxRetries === undefined
        ? undefined
        : integerInput(`${name} maxRetries`, params.maxRetries, 0),
  };
}

type Query = Record<string, string | number | boolean | undefined>;

/** The Scraper API URL with every set value in the query string, in the given order. */
function scraperApiUrl(query: Query, base = SCRAPER_API_ENDPOINT): string {
  const url = new URL(base);
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) {
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

// The HTTP deadline of a page request: its timeout (the API's 300 seconds when unset) plus 30.
function pageDeadlineSeconds(timeout?: number): number {
  return (timeout ?? DEFAULT_PAGE_TIMEOUT_SECONDS) + PAGE_DEADLINE_MARGIN_SECONDS;
}

async function callScraperApi(params: {
  cfg?: OpenClawConfig;
  consumer: string;
  label: string;
  url: string;
  timeoutSeconds: number;
  maxBytes: number;
  signal?: AbortSignal;
  /** JSON body of a POST; without one the request is a GET. */
  body?: Record<string, unknown>;
}): Promise<{ body: string; json: boolean }> {
  const apiToken = normalizeSecretInput(requireMrScraperApiToken(params.cfg, params.consumer));
  return await withStrictWebToolsEndpoint(
    {
      url: params.url,
      timeoutSeconds: params.timeoutSeconds,
      signal: params.signal,
      init: params.body
        ? {
            method: "POST",
            headers: { "content-type": "application/json", "x-api-token": apiToken },
            body: JSON.stringify(params.body),
          }
        : { headers: { "x-api-token": apiToken } },
    },
    async ({ response }) => {
      if (!response.ok) {
        await throwHttpError(response, params.label);
      }
      return {
        body: await readBoundedResponse(response, params.maxBytes, params.label),
        json: (response.headers.get("content-type") ?? "").includes("application/json"),
      };
    },
  );
}

function parseJsonObject(body: string, label: string): Record<string, unknown> {
  const payload: unknown = JSON.parse(body);
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error(`${label} response must be a JSON object.`);
  }
  return payload as Record<string, unknown>;
}

// Base64 JPEG data starts with /9j/; the documented format is PNG.
function screenshotImage(value: unknown): MrScraperScreenshot | undefined {
  const data = typeof value === "string" ? value.trim() : "";
  return data
    ? { data, mimeType: data.startsWith("/9j/") ? "image/jpeg" : "image/png" }
    : undefined;
}

/** Retrieve the raw HTML of a page. Browser rendering and a screenshot are optional. */
export async function runMrScraperFetchHtml(
  params: MrScraperFetchHtmlParams,
): Promise<Record<string, unknown> & { screenshot?: MrScraperScreenshot }> {
  // The webFetch config fills in timeout, geoCode, and blockResources when the call leaves them out.
  const page = pageInputs("fetch", {
    ...params,
    timeout: resolveMrScraperFetchTimeout(params.cfg, params.timeout),
    geoCode: resolveMrScraperGeoCode(params.cfg, params.geoCode),
    blockResources: resolveMrScraperBlockResources(params.cfg, params.blockResources),
  });
  const screenshot =
    params.screenshot === undefined ? undefined : screenshotInput("fetch", params.screenshot);
  const url = scraperApiUrl(
    {
      url: page.url,
      browserRendering: page.browserRendering,
      timeout: page.timeout,
      warmStart: page.warmStart,
      blockResources: page.blockResources,
      waitForSelector: page.waitForSelector,
      geoCode: page.geoCode,
      maxAge: page.maxAge,
      maxRetries: page.maxRetries,
      screenshot,
      html: true,
      markdown: false,
      saveResult: true,
    },
    resolveEndpoint({
      baseUrl: resolveMrScraperFetchBaseUrl(params.cfg),
      defaultBaseUrl: "https://api.mrscraper.com",
      allowedHosts: ALLOWED_SCRAPER_API_HOSTS,
      product: "MrScraper fetch",
    }),
  );

  const start = Date.now();
  const response = await callScraperApi({
    cfg: params.cfg,
    consumer: "web_fetch (mrscraper)",
    label: "MrScraper fetch",
    url,
    timeoutSeconds: pageDeadlineSeconds(page.timeout),
    maxBytes: screenshot === undefined ? MAX_PAGE_RESPONSE_BYTES : MAX_SCREENSHOT_RESPONSE_BYTES,
    signal: params.signal,
  });
  // With a screenshot, the API answers JSON holding the html and the base64 image.
  const record = response.json ? parseJsonObject(response.body, "MrScraper fetch") : undefined;
  const html = record ? (typeof record.html === "string" ? record.html : "") : response.body;
  const image = screenshotImage(record?.screenshot);

  const title = extractTitle(html);
  const plainText = htmlToPlainText(html);
  const maxChars = normalizeMaxChars(params.maxChars);
  const htmlResult = truncate(html, maxChars);
  const mode = params.extractMode ?? "text";
  const extracted = mode === "markdown" ? new TurndownService().turndown(html) : plainText;
  const textResult = truncate(extracted, maxChars);

  return {
    url: params.url,
    title: title ? wrapExternalContent(title, { source: "web_fetch", includeWarning: false }) : undefined,
    status: 200,
    contentType: mode === "markdown" ? "text/markdown" : "text/plain",
    extractor: "mrscraper",
    tookMs: Date.now() - start,
    truncated: textResult.truncated,
    text: wrapExternalContent(textResult.text, {
      source: "web_fetch",
      includeWarning: false,
    }),
    html: wrapExternalContent(htmlResult.text, { source: "web_fetch", includeWarning: false }),
    renderedText: wrapExternalContent(truncate(plainText, maxChars).text, {
      source: "web_fetch",
      includeWarning: false,
    }),
    ...(image ? { screenshot: image } : {}),
  };
}

/** Retrieve a page as Markdown. Browser rendering is optional. */
export async function runMrScraperScrapeMarkdown(
  params: MrScraperScrapeMarkdownParams,
): Promise<Record<string, unknown>> {
  const page = pageInputs("Scrape Markdown", params);
  const url = scraperApiUrl({
    url: page.url,
    browserRendering: page.browserRendering,
    timeout: page.timeout,
    geoCode: page.geoCode,
    warmStart: page.warmStart,
    blockResources: page.blockResources,
    waitForSelector: page.waitForSelector,
    maxAge: page.maxAge,
    maxRetries: page.maxRetries,
    markdown: true,
    html: false,
    screenshot: false,
    saveResult: true,
  });

  const start = Date.now();
  const response = await callScraperApi({
    cfg: params.cfg,
    consumer: "mrscraper_scrape_markdown",
    label: "MrScraper Scrape Markdown",
    url,
    timeoutSeconds: pageDeadlineSeconds(page.timeout),
    maxBytes: MAX_PAGE_RESPONSE_BYTES,
    signal: params.signal,
  });
  const record = response.json
    ? parseJsonObject(response.body, "MrScraper Scrape Markdown")
    : undefined;
  const markdown = record
    ? typeof record.markdown === "string"
      ? record.markdown
      : ""
    : response.body;

  return {
    url: params.url,
    provider: "mrscraper",
    operation: "scrape_markdown",
    tookMs: Date.now() - start,
    markdown: wrapExternalContent(markdown, { source: "web_fetch", includeWarning: false }),
  };
}

/**
 * Capture a base64 PNG screenshot of the full page, the top viewport, or a custom viewport size.
 * Browser rendering is always enabled.
 */
export async function runMrScraperGetScreenshot(
  params: MrScraperGetScreenshotParams,
): Promise<Record<string, unknown> & { screenshot: MrScraperScreenshot }> {
  const page = pageInputs("Get Screenshot", params);
  const url = scraperApiUrl({
    url: page.url,
    screenshot: screenshotInput("Get Screenshot", params.screenshot ?? "full"),
    timeout: page.timeout,
    geoCode: page.geoCode,
    waitForSelector: page.waitForSelector,
    maxAge: page.maxAge,
    maxRetries: page.maxRetries,
    browserRendering: true,
    html: false,
    markdown: false,
    saveResult: true,
  });

  const start = Date.now();
  const response = await callScraperApi({
    cfg: params.cfg,
    consumer: "mrscraper_get_screenshot",
    label: "MrScraper Get Screenshot",
    url,
    timeoutSeconds: pageDeadlineSeconds(page.timeout),
    maxBytes: MAX_SCREENSHOT_RESPONSE_BYTES,
    signal: params.signal,
  });
  const image = screenshotImage(
    parseJsonObject(response.body, "MrScraper Get Screenshot").screenshot,
  );
  if (!image) {
    throw new Error("MrScraper Get Screenshot response has no screenshot.");
  }

  return {
    url: params.url,
    provider: "mrscraper",
    operation: "get_screenshot",
    tookMs: Date.now() - start,
    screenshot: image,
  };
}

/** Extract a website's colors, typography, logos, and social links as JSON. */
export async function runMrScraperScrapeBrand(
  params: MrScraperScrapeBrandParams,
): Promise<Record<string, unknown>> {
  const url = scraperApiUrl({
    action: "brand-scraping",
    url: pageUrlInput("Scrape Brand", params.url),
    bundle: "none",
  });

  const start = Date.now();
  const response = await callScraperApi({
    cfg: params.cfg,
    consumer: "mrscraper_scrape_brand",
    label: "MrScraper Scrape Brand",
    url,
    timeoutSeconds: BRAND_TIMEOUT_SECONDS,
    maxBytes: MAX_PAGE_RESPONSE_BYTES,
    signal: params.signal,
  });
  const payload = parseJsonObject(response.body, "MrScraper Scrape Brand");

  return {
    url: params.url,
    provider: "mrscraper",
    operation: "scrape_brand",
    tookMs: Date.now() - start,
    response: wrapExternalContent(JSON.stringify(payload), { source: "web_fetch" }),
  };
}

/**
 * Extract structured JSON from a page using a natural-language prompt. Append Json Schema: and a
 * JSON schema to shape the output.
 */
export async function runMrScraperScrapeJson(
  params: MrScraperScrapeJsonParams,
): Promise<Record<string, unknown> & { screenshot?: MrScraperScreenshot }> {
  const page = pageInputs("Scrape JSON", params);
  if (params.prompt !== undefined && !params.prompt.trim()) {
    throw new Error("MrScraper Scrape JSON prompt must not be empty.");
  }
  const screenshot = params.screenshot ?? false;
  // Sent as query parameters by GET and by POST alike.
  const settings: Query = {
    html: params.html ?? true,
    screenshot,
    browserRendering: page.browserRendering,
    waitForSelector: page.waitForSelector,
    warmStart: page.warmStart,
    blockResources: page.blockResources,
    timeout: page.timeout,
    geoCode: page.geoCode,
    maxAge: page.maxAge,
    maxRetries: page.maxRetries,
  };
  const getUrl = scraperApiUrl({
    url: page.url,
    prompt: params.prompt,
    ...settings,
    agent: "general",
    saveResult: true,
  });
  // A request URL over 8,000 characters goes by POST: url, prompt, and agent in the JSON body,
  // the other settings in the query.
  const post = getUrl.length > MAX_GET_URL_CHARS;

  const start = Date.now();
  const response = await callScraperApi({
    cfg: params.cfg,
    consumer: "mrscraper_scrape_json",
    label: "MrScraper Scrape JSON",
    url: post ? scraperApiUrl({ ...settings, saveResult: true }) : getUrl,
    body: post ? { url: page.url, prompt: params.prompt, agent: "general" } : undefined,
    timeoutSeconds: pageDeadlineSeconds(page.timeout),
    maxBytes: screenshot ? MAX_SCREENSHOT_RESPONSE_BYTES : MAX_PAGE_RESPONSE_BYTES,
    signal: params.signal,
  });
  const { screenshot: data, ...payload } = parseJsonObject(response.body, "MrScraper Scrape JSON");
  const image = screenshotImage(data);

  return {
    url: params.url,
    provider: "mrscraper",
    operation: "scrape_json",
    tookMs: Date.now() - start,
    response: wrapExternalContent(JSON.stringify(payload), { source: "web_fetch" }),
    ...(image ? { screenshot: image } : {}),
  };
}

function resolveSiteName(url: string): string | undefined {
  try {
    return new URL(url).hostname || undefined;
  } catch {
    return undefined;
  }
}

function normalizeSearchResult(item: unknown): Array<Record<string, unknown>> {
  if (!item || typeof item !== "object" || Array.isArray(item)) {
    return [];
  }
  const { title, url, description } = item as Record<string, unknown>;
  const link = typeof url === "string" ? url.trim() : "";
  if (!link) {
    return [];
  }
  return [
    {
      title: typeof title === "string" && title.trim() ? wrapWebContent(title.trim(), "web_search") : "",
      url: link,
      snippet:
        typeof description === "string" && description.trim()
          ? wrapWebContent(description.trim(), "web_search")
          : "",
      siteName: resolveSiteName(link),
    },
  ];
}

export async function runMrScraperWebSearch(
  params: MrScraperWebSearchParams,
): Promise<Record<string, unknown>> {
  const query = params.query.trim();
  if (!query || [...query].length > MAX_SEARCH_QUERY_CHARS) {
    throw new Error(`MrScraper web search query must be 1 to ${MAX_SEARCH_QUERY_CHARS} characters.`);
  }
  const country = resolveMrScraperSearchCountry(params.cfg, params.country);
  // country and numResults are sent only when set; the API then searches from the United States
  // and returns up to 10 results.
  const url = new URL(SCRAPER_API_ENDPOINT);
  url.searchParams.set("action", "websearch");
  url.searchParams.set("query", query);
  if (country !== undefined) {
    url.searchParams.set("country", countryCodeInput("web search country", country));
  }
  if (params.numResults !== undefined) {
    const numResults = integerInput(
      "web search numResults",
      params.numResults,
      MIN_SEARCH_RESULTS,
      MAX_SEARCH_RESULTS,
    );
    url.searchParams.set("numResults", String(numResults));
  }
  const apiToken = requireMrScraperApiToken(params.cfg, "web_search (mrscraper)");
  const timeoutSeconds = resolveMrScraperSearchTimeoutSeconds(params.cfg);

  const start = Date.now();
  const payload = await withStrictWebToolsEndpoint(
    {
      url: url.toString(),
      timeoutSeconds,
      signal: params.signal,
      init: {
        method: "GET",
        headers: { accept: "application/json", "x-api-token": normalizeSecretInput(apiToken) },
      },
    },
    async ({ response }) => {
      if (!response.ok) {
        await throwHttpError(response, "MrScraper web search");
      }
      const text = await readBoundedResponse(response, MAX_SEARCH_RESPONSE_BYTES, "MrScraper web search");
      return JSON.parse(text) as unknown;
    },
  );

  const record =
    payload && typeof payload === "object" && !Array.isArray(payload)
      ? (payload as Record<string, unknown>)
      : undefined;
  if (record?.success !== true) {
    const detail =
      typeof record?.message === "string"
        ? record.message
        : typeof record?.error === "string"
          ? record.error
          : "unexpected response";
    throw new Error(
      `MrScraper web search failed: ${wrapWebContent(detail.slice(0, MAX_ERROR_DETAIL_CHARS), "web_fetch")}`,
    );
  }
  if (!Array.isArray(record.data)) {
    throw new Error("MrScraper web search response has no results list.");
  }

  const results = record.data.flatMap(normalizeSearchResult).slice(0, params.count);
  return {
    query,
    provider: "mrscraper",
    count: results.length,
    tookMs: Date.now() - start,
    ...(typeof record.tokenUsage === "number" ? { tokenUsage: record.tokenUsage } : {}),
    externalContent: {
      untrusted: true,
      source: "web_search",
      provider: "mrscraper",
      wrapped: true,
    },
    results,
  };
}

export async function runMrScraperCreateAiScraper(
  params: MrScraperCreateAiScraperParams,
): Promise<Record<string, unknown>> {
  const apiToken = requireMrScraperApiToken(params.cfg, "mrscraper_scrape");
  const endpoint = resolvePlatformEndpoint("/api/v1/scrapers-ai", params.cfg);
  const timeoutSeconds = resolvePlatformTimeoutSeconds(params.cfg, params.timeoutSeconds);

  const body: Record<string, unknown> = {
    url: params.url,
    message: params.message,
    agent: params.agent ?? "general",
  };
  const proxyCountry = resolveMrScraperProxyCountry(params.cfg, params.proxyCountry);
  if (proxyCountry) {
    body.proxyCountry = proxyCountry;
  }
  if (params.agent === "map") {
    if (typeof params.maxDepth === "number") {
      body.maxDepth = Math.floor(params.maxDepth);
    }
    if (typeof params.maxPages === "number") {
      body.maxPages = Math.floor(params.maxPages);
    }
    if (typeof params.limit === "number") {
      body.limit = Math.floor(params.limit);
    }
    if (params.includePatterns) {
      body.includePatterns = params.includePatterns;
    }
    if (params.excludePatterns) {
      body.excludePatterns = params.excludePatterns;
    }
  }

  const start = Date.now();
  const payload = await runPlatformJsonRequest({
    cfg: params.cfg,
    apiToken,
    endpoint,
    timeoutSeconds,
    label: "MrScraper AI scraper",
    init: {
      method: "POST",
      headers: buildPlatformHeaders(apiToken),
      body: JSON.stringify(body),
    },
  });

  return {
    provider: "mrscraper",
    operation: "create_ai_scraper",
    tookMs: Date.now() - start,
    response: wrapExternalContent(JSON.stringify(payload), { source: "web_fetch" }),
  };
}

export async function runMrScraperRerunAiScraper(
  params: MrScraperRerunAiScraperParams,
): Promise<Record<string, unknown>> {
  const apiToken = requireMrScraperApiToken(params.cfg, "mrscraper_rerun_ai_scraper");
  const endpoint = resolvePlatformEndpoint("/api/v1/scrapers-ai-rerun", params.cfg);
  const body: Record<string, unknown> = {
    scraperId: params.scraperId,
    url: params.url,
  };
  if (typeof params.maxDepth === "number") {
    body.maxDepth = Math.floor(params.maxDepth);
  }
  if (typeof params.maxPages === "number") {
    body.maxPages = Math.floor(params.maxPages);
  }
  if (typeof params.limit === "number") {
    body.limit = Math.floor(params.limit);
  }
  if (params.includePatterns) {
    body.includePatterns = params.includePatterns;
  }
  if (params.excludePatterns) {
    body.excludePatterns = params.excludePatterns;
  }

  const start = Date.now();
  const payload = await runPlatformJsonRequest({
    cfg: params.cfg,
    apiToken,
    endpoint,
    timeoutSeconds: params.timeoutSeconds,
    label: "MrScraper AI rerun",
    init: {
      method: "POST",
      headers: buildPlatformHeaders(apiToken),
      body: JSON.stringify(body),
    },
  });

  return {
    provider: "mrscraper",
    operation: "rerun_ai_scraper",
    tookMs: Date.now() - start,
    response: wrapExternalContent(JSON.stringify(payload), { source: "web_fetch" }),
  };
}

export async function runMrScraperBulkRerunAiScraper(
  params: MrScraperBulkRerunAiScraperParams,
): Promise<Record<string, unknown>> {
  const apiToken = requireMrScraperApiToken(params.cfg, "mrscraper_bulk_rerun_ai_scraper");
  const endpoint = resolvePlatformEndpoint("/api/v1/scrapers-ai-rerun/bulk", params.cfg);
  const start = Date.now();
  const payload = await runPlatformJsonRequest({
    cfg: params.cfg,
    apiToken,
    endpoint,
    timeoutSeconds: params.timeoutSeconds,
    label: "MrScraper AI bulk rerun",
    init: {
      method: "POST",
      headers: buildPlatformHeaders(apiToken),
      body: JSON.stringify({
        scraperId: params.scraperId,
        urls: params.urls,
      }),
    },
  });

  return {
    provider: "mrscraper",
    operation: "bulk_rerun_ai_scraper",
    tookMs: Date.now() - start,
    response: wrapExternalContent(JSON.stringify(payload), { source: "web_fetch" }),
  };
}

export async function runMrScraperRerunManualScraper(
  params: MrScraperRerunManualScraperParams,
): Promise<Record<string, unknown>> {
  const apiToken = requireMrScraperApiToken(params.cfg, "mrscraper_rerun_manual_scraper");
  const endpoint = resolvePlatformEndpoint("/api/v1/scrapers-manual-rerun", params.cfg);
  const start = Date.now();
  const payload = await runPlatformJsonRequest({
    cfg: params.cfg,
    apiToken,
    endpoint,
    timeoutSeconds: params.timeoutSeconds,
    label: "MrScraper manual rerun",
    init: {
      method: "POST",
      headers: buildPlatformHeaders(apiToken),
      body: JSON.stringify({
        scraperId: params.scraperId,
        url: params.url,
      }),
    },
  });

  return {
    provider: "mrscraper",
    operation: "rerun_manual_scraper",
    tookMs: Date.now() - start,
    response: wrapExternalContent(JSON.stringify(payload), { source: "web_fetch" }),
  };
}

export async function runMrScraperBulkRerunManualScraper(
  params: MrScraperBulkRerunManualScraperParams,
): Promise<Record<string, unknown>> {
  const apiToken = requireMrScraperApiToken(params.cfg, "mrscraper_bulk_rerun_manual_scraper");
  const endpoint = resolvePlatformEndpoint("/api/v1/scrapers-manual-rerun/bulk", params.cfg);
  const start = Date.now();
  const payload = await runPlatformJsonRequest({
    cfg: params.cfg,
    apiToken,
    endpoint,
    timeoutSeconds: params.timeoutSeconds,
    label: "MrScraper manual bulk rerun",
    init: {
      method: "POST",
      headers: buildPlatformHeaders(apiToken),
      body: JSON.stringify({
        scraperId: params.scraperId,
        urls: params.urls,
      }),
    },
  });

  return {
    provider: "mrscraper",
    operation: "bulk_rerun_manual_scraper",
    tookMs: Date.now() - start,
    response: wrapExternalContent(JSON.stringify(payload), { source: "web_fetch" }),
  };
}

export async function runMrScraperGetAllResults(
  params: MrScraperGetAllResultsParams,
): Promise<Record<string, unknown>> {
  const apiToken = requireMrScraperApiToken(params.cfg, "mrscraper_get_all_results");
  const endpoint = new URL(resolvePlatformEndpoint("/api/v1/results", params.cfg));
  endpoint.searchParams.set("sortField", params.sortField ?? "updatedAt");
  endpoint.searchParams.set("sortOrder", params.sortOrder ?? "DESC");
  endpoint.searchParams.set("pageSize", String(params.pageSize ?? 10));
  endpoint.searchParams.set("page", String(params.page ?? 1));
  if (params.search) {
    endpoint.searchParams.set("search", params.search);
  }
  if (params.dateRangeColumn) {
    endpoint.searchParams.set("dateRangeColumn", params.dateRangeColumn);
  }
  if (params.startAt) {
    endpoint.searchParams.set("startAt", params.startAt);
  }
  if (params.endAt) {
    endpoint.searchParams.set("endAt", params.endAt);
  }

  const start = Date.now();
  const payload = await runPlatformJsonRequest({
    cfg: params.cfg,
    apiToken,
    endpoint: endpoint.toString(),
    timeoutSeconds: params.timeoutSeconds,
    label: "MrScraper results list",
    init: {
      method: "GET",
      headers: buildPlatformHeaders(apiToken),
    },
  });

  return {
    provider: "mrscraper",
    operation: "get_all_results",
    tookMs: Date.now() - start,
    response: wrapExternalContent(JSON.stringify(payload), { source: "web_fetch" }),
  };
}

export async function runMrScraperGetResultById(
  params: MrScraperGetResultByIdParams,
): Promise<Record<string, unknown>> {
  const apiToken = requireMrScraperApiToken(params.cfg, "mrscraper_get_result_by_id");
  const endpoint = resolvePlatformEndpoint(
    `/api/v1/results/${encodeURIComponent(params.resultId)}`,
    params.cfg,
  );
  const start = Date.now();
  const payload = await runPlatformJsonRequest({
    cfg: params.cfg,
    apiToken,
    endpoint,
    timeoutSeconds: params.timeoutSeconds,
    label: "MrScraper result lookup",
    init: {
      method: "GET",
      headers: buildPlatformHeaders(apiToken),
    },
  });

  return {
    provider: "mrscraper",
    operation: "get_result_by_id",
    tookMs: Date.now() - start,
    response: wrapExternalContent(JSON.stringify(payload), { source: "web_fetch" }),
  };
}

export const __testing = {
  decodeHtmlEntities,
  extractTitle,
  htmlToPlainText,
  resolveEndpoint,
};
