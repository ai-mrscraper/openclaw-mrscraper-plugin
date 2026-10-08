import TurndownService from "turndown";
import { readResponseText, resolveTimeoutSeconds, withStrictWebToolsEndpoint, wrapExternalContent, wrapWebContent, } from "openclaw/plugin-sdk/provider-web-fetch";
import { normalizeSecretInput } from "openclaw/plugin-sdk/secret-input";
import { resolveMrScraperApiToken, resolveMrScraperBlockResources, resolveMrScraperFetchTimeoutSeconds, resolveMrScraperGeoCode, resolveMrScraperPlatformBaseUrl, resolveMrScraperProxyCountry, resolveMrScraperScrapeTimeoutSeconds, resolveMrScraperUnblockerBaseUrl, } from "./config.js";
const ALLOWED_UNBLOCKER_HOSTS = new Set(["api.mrscraper.com"]);
const ALLOWED_PLATFORM_HOSTS = new Set(["api.app.mrscraper.com"]);
const DEFAULT_FETCH_MAX_CHARS = 50_000;
const MAX_UNBLOCKER_RESPONSE_BYTES = 5_000_000;
const MAX_PLATFORM_RESPONSE_BYTES = 5_000_000;
const MAX_ERROR_RESPONSE_BYTES = 64_000;
const MAX_ERROR_DETAIL_CHARS = 1_000;
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
export async function runMrScraperFetchHtml(params) {
    const apiToken = requireMrScraperApiToken(params.cfg, "web_fetch (mrscraper)");
    const baseUrl = resolveEndpoint({
        baseUrl: resolveMrScraperUnblockerBaseUrl(params.cfg),
        defaultBaseUrl: "https://api.mrscraper.com",
        allowedHosts: ALLOWED_UNBLOCKER_HOSTS,
        product: "MrScraper unblocker",
    });
    const timeoutSeconds = resolveTimeoutSeconds(params.timeoutSeconds, resolveMrScraperFetchTimeoutSeconds(params.cfg));
    const url = new URL(baseUrl);
    url.searchParams.set("url", params.url);
    url.searchParams.set("timeout", String(timeoutSeconds));
    const geoCode = resolveMrScraperGeoCode(params.cfg, params.geoCode);
    if (geoCode) {
        url.searchParams.set("geoCode", geoCode);
    }
    if (resolveMrScraperBlockResources(params.cfg, params.blockResources)) {
        url.searchParams.set("blockResources", "true");
    }
    const start = Date.now();
    const html = await withStrictWebToolsEndpoint({
        url: url.toString(),
        timeoutSeconds,
        init: { headers: { "x-api-token": normalizeSecretInput(apiToken) } },
    }, async ({ response }) => {
        if (!response.ok) {
            await throwHttpError(response, "MrScraper unblocker");
        }
        return await readBoundedResponse(response, MAX_UNBLOCKER_RESPONSE_BYTES, "MrScraper unblocker");
    });
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
