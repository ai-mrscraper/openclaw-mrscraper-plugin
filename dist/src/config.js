import { normalizeResolvedSecretInputString, normalizeSecretInput, } from "openclaw/plugin-sdk/secret-input";
export const DEFAULT_MRSCRAPER_SCRAPER_API_BASE_URL = "https://api.mrscraper.com";
export const DEFAULT_MRSCRAPER_PLATFORM_BASE_URL = "https://api.app.mrscraper.com";
export const DEFAULT_MRSCRAPER_SCRAPE_TIMEOUT_SECONDS = 120;
export const DEFAULT_MRSCRAPER_SEARCH_TIMEOUT_SECONDS = 60;
function resolvePluginConfig(cfg) {
    const pluginConfig = cfg?.plugins?.entries?.mrscraper?.config;
    if (pluginConfig && typeof pluginConfig === "object" && !Array.isArray(pluginConfig)) {
        return pluginConfig;
    }
    return undefined;
}
function resolveLegacyFetchConfig(cfg) {
    const fetch = cfg?.tools?.web?.fetch;
    if (fetch && typeof fetch === "object" && !Array.isArray(fetch)) {
        return fetch;
    }
    return undefined;
}
function normalizeConfiguredSecret(value, path) {
    return normalizeSecretInput(normalizeResolvedSecretInputString({
        value,
        path,
    }));
}
export function resolveMrScraperApiToken(cfg) {
    const pluginConfig = resolvePluginConfig(cfg);
    const legacyFetch = resolveLegacyFetchConfig(cfg);
    return (normalizeConfiguredSecret(pluginConfig?.apiToken, "plugins.entries.mrscraper.config.apiToken") ||
        normalizeConfiguredSecret(legacyFetch?.mrscraper?.apiToken, "tools.web.fetch.mrscraper.apiToken") ||
        normalizeSecretInput(process.env.MRSCRAPER_API_TOKEN) ||
        undefined);
}
/** Raw configured token. The web fetch and web search providers share this path. */
export function readMrScraperConfiguredApiToken(config) {
    return resolvePluginConfig(config)?.apiToken;
}
export function writeMrScraperConfiguredApiToken(configTarget, value) {
    const plugins = (configTarget.plugins ??= {});
    const entries = (plugins.entries ??= {});
    const entry = (entries.mrscraper ??= {});
    const pluginConfig = entry.config && typeof entry.config === "object" && !Array.isArray(entry.config)
        ? entry.config
        : ((entry.config = {}), entry.config);
    pluginConfig.apiToken = value;
}
export function resolveMrScraperWebFetchConfig(cfg) {
    return resolvePluginConfig(cfg)?.webFetch;
}
export function resolveMrScraperPlatformConfig(cfg) {
    return resolvePluginConfig(cfg)?.platform;
}
export function resolveMrScraperWebSearchConfig(cfg) {
    return resolvePluginConfig(cfg)?.webSearch;
}
export function resolveMrScraperFetchBaseUrl(cfg) {
    const configured = (typeof resolveMrScraperWebFetchConfig(cfg)?.baseUrl === "string"
        ? resolveMrScraperWebFetchConfig(cfg)?.baseUrl?.trim()
        : "") || "";
    return configured || DEFAULT_MRSCRAPER_SCRAPER_API_BASE_URL;
}
export function resolveMrScraperPlatformBaseUrl(cfg) {
    const configured = (typeof resolveMrScraperPlatformConfig(cfg)?.baseUrl === "string"
        ? resolveMrScraperPlatformConfig(cfg)?.baseUrl?.trim()
        : "") || "";
    return configured || DEFAULT_MRSCRAPER_PLATFORM_BASE_URL;
}
/** Page timeout in seconds: the call's value, else webFetch.timeoutSeconds. Unset leaves the API default. */
export function resolveMrScraperFetchTimeout(cfg, override) {
    if (typeof override === "number") {
        return override;
    }
    const configured = resolveMrScraperWebFetchConfig(cfg)?.timeoutSeconds;
    return typeof configured === "number" ? configured : undefined;
}
export function resolveMrScraperScrapeTimeoutSeconds(cfg) {
    const configured = resolveMrScraperPlatformConfig(cfg)?.timeoutSeconds;
    if (typeof configured === "number" && Number.isFinite(configured) && configured > 0) {
        return Math.floor(configured);
    }
    return DEFAULT_MRSCRAPER_SCRAPE_TIMEOUT_SECONDS;
}
export function resolveMrScraperSearchTimeoutSeconds(cfg) {
    const configured = resolveMrScraperWebSearchConfig(cfg)?.timeoutSeconds;
    if (typeof configured === "number" && Number.isFinite(configured) && configured > 0) {
        return Math.floor(configured);
    }
    return DEFAULT_MRSCRAPER_SEARCH_TIMEOUT_SECONDS;
}
export function resolveMrScraperGeoCode(cfg, override) {
    const candidate = (typeof override === "string" ? override.trim() : "") ||
        (typeof resolveMrScraperWebFetchConfig(cfg)?.geoCode === "string"
            ? resolveMrScraperWebFetchConfig(cfg)?.geoCode?.trim()
            : "") ||
        "";
    return candidate || undefined;
}
/** blockResources: the call's value, else webFetch.blockResources. Unset leaves the API default. */
export function resolveMrScraperBlockResources(cfg, override) {
    if (typeof override === "boolean") {
        return override;
    }
    const configured = resolveMrScraperWebFetchConfig(cfg)?.blockResources;
    return typeof configured === "boolean" ? configured : undefined;
}
export function resolveMrScraperProxyCountry(cfg, override) {
    const candidate = (typeof override === "string" ? override.trim() : "") ||
        (typeof resolveMrScraperPlatformConfig(cfg)?.proxyCountry === "string"
            ? resolveMrScraperPlatformConfig(cfg)?.proxyCountry?.trim()
            : "") ||
        "";
    return candidate || undefined;
}
export function resolveMrScraperSearchCountry(cfg, override) {
    const candidate = (typeof override === "string" ? override.trim() : "") ||
        (typeof resolveMrScraperWebSearchConfig(cfg)?.country === "string"
            ? resolveMrScraperWebSearchConfig(cfg)?.country?.trim()
            : "") ||
        "";
    return candidate || undefined;
}
