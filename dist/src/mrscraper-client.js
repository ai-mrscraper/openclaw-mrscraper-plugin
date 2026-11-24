import TurndownService from "turndown";
import { readResponseText, resolveTimeoutSeconds, withStrictWebToolsEndpoint, wrapExternalContent, wrapWebContent, } from "openclaw/plugin-sdk/provider-web-fetch";
import { normalizeSecretInput } from "openclaw/plugin-sdk/secret-input";
import { DEFAULT_MRSCRAPER_SCRAPER_API_BASE_URL, resolveMrScraperApiToken, resolveMrScraperBlockResources, resolveMrScraperFetchBaseUrl, resolveMrScraperFetchTimeout, resolveMrScraperGeoCode, resolveMrScraperPlatformBaseUrl, resolveMrScraperProxyCountry, resolveMrScraperScrapeTimeoutSeconds, resolveMrScraperSearchCountry, resolveMrScraperSearchTimeoutSeconds, } from "./config.js";
const ALLOWED_SCRAPER_API_HOSTS = new Set(["api.mrscraper.com"]);
const ALLOWED_PLATFORM_HOSTS = new Set(["api.app.mrscraper.com"]);
const DEFAULT_FETCH_MAX_CHARS = 50_000;
const MAX_FETCH_RESPONSE_BYTES = 5_000_000;
// A screenshot arrives as base64 image data next to the HTML.
const MAX_SCREENSHOT_RESPONSE_BYTES = 25_000_000;
const MAX_PLATFORM_RESPONSE_BYTES = 5_000_000;
const MAX_ERROR_RESPONSE_BYTES = 64_000;
const MAX_ERROR_DETAIL_CHARS = 1_000;
const MAX_SEARCH_RESPONSE_BYTES = 1_000_000;
// The API scrapes for up to 300 seconds when no timeout is sent; the HTTP deadline adds 30.
const DEFAULT_PAGE_TIMEOUT_SECONDS = 300;
const PAGE_DEADLINE_MARGIN_SECONDS = 30;
const MAX_PAGE_TIMEOUT_SECONDS = 330;
// maxAge accepts up to 7 days, in milliseconds.
const MAX_AGE_MS = 604_800_000;
const MAX_WAIT_FOR_SELECTOR_CHARS = 500;
const MAX_SEARCH_QUERY_CHARS = 1_000;
const MIN_SEARCH_RESULTS = 10;
const MAX_SEARCH_RESULTS = 100;
const COUNTRY_CODE_PATTERN = /^[a-z]{2}$/i;
// full, top, or <width>x<height> with an optional -<zoom> percent.
const SCREENSHOT_PATTERN = /^(full|top|[0-9]{3,4}x[0-9]{3,4}(-[0-9]{2,3})?)$/;
const WEB_SEARCH_ENDPOINT = `${DEFAULT_MRSCRAPER_SCRAPER_API_BASE_URL}/`;
function resolveEndpoint(params) {
    const candidate = params.baseUrl.trim() || params.defaultBaseUrl;
    let url;
    try {
        url = new URL(candidate);
    }
    catch {
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
async function throwHttpError(response, label) {
    let detail = typeof response.statusText === "string" && response.statusText.trim()
        ? response.statusText.trim()
        : "request failed";
    const errorBody = await readResponseText(response, { maxBytes: MAX_ERROR_RESPONSE_BYTES });
    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("application/json") && !errorBody.truncated) {
        try {
            const payload = JSON.parse(errorBody.text);
            const record = payload && typeof payload === "object" && !Array.isArray(payload)
                ? payload
                : undefined;
            detail =
                typeof record?.message === "string"
                    ? record.message
                    : typeof record?.error === "string"
                        ? record.error
                        : detail;
        }
        catch {
            // Keep the status text when the bounded error body is not valid JSON.
        }
    }
    else if (errorBody.text) {
        detail = errorBody.text;
    }
    throw new Error(`${label} API error (${response.status}): ${wrapWebContent(detail.slice(0, MAX_ERROR_DETAIL_CHARS), "web_fetch")}`);
}
async function readBoundedResponse(response, maxBytes, label) {
    const result = await readResponseText(response, { maxBytes });
    if (result.truncated) {
        throw new Error(`${label} response exceeds the ${maxBytes}-byte limit.`);
    }
    return result.text;
}
function buildPlatformHeaders(apiToken) {
    return {
        accept: "application/json",
        "content-type": "application/json",
        "x-api-token": normalizeSecretInput(apiToken),
    };
}
function resolvePlatformEndpoint(pathname, cfg) {
    return resolveEndpoint({
        baseUrl: resolveMrScraperPlatformBaseUrl(cfg),
        defaultBaseUrl: "https://api.app.mrscraper.com",
        pathname,
        allowedHosts: ALLOWED_PLATFORM_HOSTS,
        product: "MrScraper platform",
    });
}
function resolvePlatformTimeoutSeconds(cfg, override) {
    return resolveTimeoutSeconds(override, resolveMrScraperScrapeTimeoutSeconds(cfg));
}
async function runPlatformJsonRequest(params) {
    const timeoutSeconds = resolvePlatformTimeoutSeconds(params.cfg, params.timeoutSeconds);
    return await withStrictWebToolsEndpoint({
        url: params.endpoint,
        timeoutSeconds,
        init: params.init,
    }, async ({ response }) => {
        if (!response.ok) {
            await throwHttpError(response, params.label);
        }
        const body = await readBoundedResponse(response, MAX_PLATFORM_RESPONSE_BYTES, params.label);
        const payload = JSON.parse(body);
        if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
            throw new Error(`${params.label} response must be a JSON object.`);
        }
        return payload;
    });
}
function requireMrScraperApiToken(cfg, consumer) {
    const apiToken = resolveMrScraperApiToken(cfg);
    if (!apiToken) {
        throw new Error(`${consumer} needs a MrScraper API token. Set MRSCRAPER_API_TOKEN in the Gateway environment, or configure plugins.entries.mrscraper.config.apiToken.`);
    }
    return apiToken;
}
function extractTitle(html) {
    const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    if (!match?.[1]) {
        return undefined;
    }
    return decodeHtmlEntities(match[1]).trim() || undefined;
}
function decodeHtmlEntities(value) {
    return value
        .replace(/&nbsp;/gi, " ")
        .replace(/&amp;/gi, "&")
        .replace(/&lt;/gi, "<")
        .replace(/&gt;/gi, ">")
        .replace(/&quot;/gi, '"')
        .replace(/&#39;/gi, "'");
}
function htmlToPlainText(html) {
    return decodeHtmlEntities(html
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
        .trim());
}
function normalizeMaxChars(maxChars) {
    if (typeof maxChars === "number" && Number.isFinite(maxChars) && maxChars > 0) {
        return Math.floor(maxChars);
    }
    return DEFAULT_FETCH_MAX_CHARS;
}
function truncate(value, maxChars) {
    if (value.length <= maxChars) {
        return { text: value, truncated: false };
    }
    return {
        text: value.slice(0, Math.max(0, maxChars - 1)).trimEnd(),
        truncated: true,
    };
}
function pageUrlInput(value) {
    let parsed;
    try {
        parsed = new URL(value);
    }
    catch {
        // Reported below.
    }
    if (!parsed || (parsed.protocol !== "http:" && parsed.protocol !== "https:")) {
        throw new Error("MrScraper fetch url must be an absolute HTTP or HTTPS URL that includes the protocol, such as https://example.com.");
    }
    return value;
}
function integerInput(name, value, min, max) {
    if (!Number.isSafeInteger(value) || value < min || (max !== undefined && value > max)) {
        throw new Error(max === undefined
            ? `MrScraper ${name} must be an integer of at least ${min}.`
            : `MrScraper ${name} must be an integer from ${min} to ${max}.`);
    }
    return value;
}
function countryCodeInput(name, value) {
    if (!COUNTRY_CODE_PATTERN.test(value)) {
        throw new Error(`MrScraper ${name} must be a two-letter code such as us or gb, not "${value}".`);
    }
    return value.toLowerCase();
}
function waitForSelectorInput(value) {
    const selector = value.trim();
    if (!selector || [...selector].length > MAX_WAIT_FOR_SELECTOR_CHARS) {
        throw new Error(`MrScraper fetch waitForSelector must be 1 to ${MAX_WAIT_FOR_SELECTOR_CHARS} characters.`);
    }
    return selector;
}
function isScreenshotArea(value) {
    if (!SCREENSHOT_PATTERN.test(value)) {
        return false;
    }
    if (value === "full" || value === "top") {
        return true;
    }
    const [size = "", zoom] = value.split("-");
    const [width = 0, height = 0] = size.split("x").map(Number);
    const within = (number, min, max) => number >= min && number <= max;
    return (within(width, 100, 3840) &&
        within(height, 100, 3840) &&
        (zoom === undefined || within(Number(zoom), 25, 300)));
}
function screenshotInput(value) {
    if (!isScreenshotArea(value)) {
        throw new Error("MrScraper fetch screenshot must be full, top, or <width>x<height> with an optional -<zoom>, such as 1280x800 or 1920x1080-75 (width and height 100 to 3840, zoom 25 to 300).");
    }
    return value;
}
// With a screenshot, the API answers JSON holding the html and the base64 image.
function parsePageJson(body) {
    const payload = JSON.parse(body);
    const record = payload && typeof payload === "object" && !Array.isArray(payload)
        ? payload
        : {};
    const html = typeof record.html === "string" ? record.html : "";
    const data = typeof record.screenshot === "string" ? record.screenshot.trim() : "";
    if (!data) {
        return { html };
    }
    // Base64 JPEG data starts with /9j/; the documented format is PNG.
    return {
        html,
        screenshot: { data, mimeType: data.startsWith("/9j/") ? "image/jpeg" : "image/png" },
    };
}
export async function runMrScraperFetchHtml(params) {
    const timeout = resolveMrScraperFetchTimeout(params.cfg, params.timeout);
    const geoCode = resolveMrScraperGeoCode(params.cfg, params.geoCode);
    // Optional inputs are sent only when set, so the API defaults apply to the rest. maxAge is
    // always sent (0, a fresh scrape, unless set), and every result is saved to the account.
    const query = {
        url: pageUrlInput(params.url),
        browserRendering: params.browserRendering,
        timeout: timeout === undefined
            ? undefined
            : integerInput("fetch timeout", timeout, 1, MAX_PAGE_TIMEOUT_SECONDS),
        warmStart: params.warmStart,
        blockResources: resolveMrScraperBlockResources(params.cfg, params.blockResources),
        waitForSelector: params.waitForSelector === undefined ? undefined : waitForSelectorInput(params.waitForSelector),
        geoCode: geoCode === undefined ? undefined : countryCodeInput("fetch geoCode", geoCode),
        maxAge: integerInput("fetch maxAge", params.maxAge ?? 0, 0, MAX_AGE_MS),
        maxRetries: params.maxRetries === undefined
            ? undefined
            : integerInput("fetch maxRetries", params.maxRetries, 0),
        screenshot: params.screenshot === undefined ? undefined : screenshotInput(params.screenshot),
        html: true,
        markdown: false,
        saveResult: true,
    };
    const apiToken = requireMrScraperApiToken(params.cfg, "web_fetch (mrscraper)");
    const url = new URL(resolveEndpoint({
        baseUrl: resolveMrScraperFetchBaseUrl(params.cfg),
        defaultBaseUrl: "https://api.mrscraper.com",
        allowedHosts: ALLOWED_SCRAPER_API_HOSTS,
        product: "MrScraper fetch",
    }));
    for (const [key, value] of Object.entries(query)) {
        if (value !== undefined) {
            url.searchParams.set(key, String(value));
        }
    }
    const start = Date.now();
    const page = await withStrictWebToolsEndpoint({
        url: url.toString(),
        timeoutSeconds: (timeout ?? DEFAULT_PAGE_TIMEOUT_SECONDS) + PAGE_DEADLINE_MARGIN_SECONDS,
        init: { headers: { "x-api-token": normalizeSecretInput(apiToken) } },
    }, async ({ response }) => {
        if (!response.ok) {
            await throwHttpError(response, "MrScraper fetch");
        }
        const body = await readBoundedResponse(response, query.screenshot === undefined ? MAX_FETCH_RESPONSE_BYTES : MAX_SCREENSHOT_RESPONSE_BYTES, "MrScraper fetch");
        return (response.headers.get("content-type") ?? "").includes("application/json")
            ? parsePageJson(body)
            : { html: body };
    });
    const { html } = page;
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
        ...(page.screenshot ? { screenshot: page.screenshot } : {}),
    };
}
function resolveSiteName(url) {
    try {
        return new URL(url).hostname || undefined;
    }
    catch {
        return undefined;
    }
}
function normalizeSearchResult(item) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
        return [];
    }
    const { title, url, description } = item;
    const link = typeof url === "string" ? url.trim() : "";
    if (!link) {
        return [];
    }
    return [
        {
            title: typeof title === "string" && title.trim() ? wrapWebContent(title.trim(), "web_search") : "",
            url: link,
            snippet: typeof description === "string" && description.trim()
                ? wrapWebContent(description.trim(), "web_search")
                : "",
            siteName: resolveSiteName(link),
        },
    ];
}
export async function runMrScraperWebSearch(params) {
    const query = params.query.trim();
    if (!query || [...query].length > MAX_SEARCH_QUERY_CHARS) {
        throw new Error(`MrScraper web search query must be 1 to ${MAX_SEARCH_QUERY_CHARS} characters.`);
    }
    const country = resolveMrScraperSearchCountry(params.cfg, params.country);
    // country and numResults are sent only when set; the API then searches from the United States
    // and returns up to 10 results.
    const url = new URL(WEB_SEARCH_ENDPOINT);
    url.searchParams.set("action", "websearch");
    url.searchParams.set("query", query);
    if (country !== undefined) {
        url.searchParams.set("country", countryCodeInput("web search country", country));
    }
    if (params.numResults !== undefined) {
        const numResults = integerInput("web search numResults", params.numResults, MIN_SEARCH_RESULTS, MAX_SEARCH_RESULTS);
        url.searchParams.set("numResults", String(numResults));
    }
    const apiToken = requireMrScraperApiToken(params.cfg, "web_search (mrscraper)");
    const timeoutSeconds = resolveMrScraperSearchTimeoutSeconds(params.cfg);
    const start = Date.now();
    const payload = await withStrictWebToolsEndpoint({
        url: url.toString(),
        timeoutSeconds,
        signal: params.signal,
        init: {
            method: "GET",
            headers: { accept: "application/json", "x-api-token": normalizeSecretInput(apiToken) },
        },
    }, async ({ response }) => {
        if (!response.ok) {
            await throwHttpError(response, "MrScraper web search");
        }
        const text = await readBoundedResponse(response, MAX_SEARCH_RESPONSE_BYTES, "MrScraper web search");
        return JSON.parse(text);
    });
    const record = payload && typeof payload === "object" && !Array.isArray(payload)
        ? payload
        : undefined;
    if (record?.success !== true) {
        const detail = typeof record?.message === "string"
            ? record.message
            : typeof record?.error === "string"
                ? record.error
                : "unexpected response";
        throw new Error(`MrScraper web search failed: ${wrapWebContent(detail.slice(0, MAX_ERROR_DETAIL_CHARS), "web_fetch")}`);
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
export async function runMrScraperCreateAiScraper(params) {
    const apiToken = requireMrScraperApiToken(params.cfg, "mrscraper_scrape");
    const endpoint = resolvePlatformEndpoint("/api/v1/scrapers-ai", params.cfg);
    const timeoutSeconds = resolvePlatformTimeoutSeconds(params.cfg, params.timeoutSeconds);
    const body = {
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
export async function runMrScraperRerunAiScraper(params) {
    const apiToken = requireMrScraperApiToken(params.cfg, "mrscraper_rerun_ai_scraper");
    const endpoint = resolvePlatformEndpoint("/api/v1/scrapers-ai-rerun", params.cfg);
    const body = {
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
export async function runMrScraperBulkRerunAiScraper(params) {
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
export async function runMrScraperRerunManualScraper(params) {
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
export async function runMrScraperBulkRerunManualScraper(params) {
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
export async function runMrScraperGetAllResults(params) {
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
export async function runMrScraperGetResultById(params) {
    const apiToken = requireMrScraperApiToken(params.cfg, "mrscraper_get_result_by_id");
    const endpoint = resolvePlatformEndpoint(`/api/v1/results/${encodeURIComponent(params.resultId)}`, params.cfg);
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
