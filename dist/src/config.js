import { normalizeResolvedSecretInputString, normalizeSecretInput, } from "openclaw/plugin-sdk/secret-input";
export const DEFAULT_MRSCRAPER_UNBLOCKER_BASE_URL = "https://api.mrscraper.com";
export const DEFAULT_MRSCRAPER_PLATFORM_BASE_URL = "https://api.app.mrscraper.com";
export const DEFAULT_MRSCRAPER_FETCH_TIMEOUT_SECONDS = 60;
export const DEFAULT_MRSCRAPER_SCRAPE_TIMEOUT_SECONDS = 120;
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
export function resolveMrScraperWebFetchConfig(cfg) {
    return resolvePluginConfig(cfg)?.webFetch;
}
export function resolveMrScraperPlatformConfig(cfg) {
    return resolvePluginConfig(cfg)?.platform;
}
export function resolveMrScraperUnblockerBaseUrl(cfg) {
    const configured = (typeof resolveMrScraperWebFetchConfig(cfg)?.baseUrl === "string"
        ? resolveMrScraperWebFetchConfig(cfg)?.baseUrl?.trim()
        : "") || "";
    return configured || DEFAULT_MRSCRAPER_UNBLOCKER_BASE_URL;
}
export function resolveMrScraperPlatformBaseUrl(cfg) {
    const configured = (typeof resolveMrScraperPlatformConfig(cfg)?.baseUrl === "string"
        ? resolveMrScraperPlatformConfig(cfg)?.baseUrl?.trim()
        : "") || "";
    return configured || DEFAULT_MRSCRAPER_PLATFORM_BASE_URL;
}
export function resolveMrScraperFetchTimeoutSeconds(cfg) {
    const configured = resolveMrScraperWebFetchConfig(cfg)?.timeoutSeconds;
    if (typeof configured === "number" && Number.isFinite(configured) && configured > 0) {
        return Math.floor(configured);
    }
    return DEFAULT_MRSCRAPER_FETCH_TIMEOUT_SECONDS;
}
export function resolveMrScraperScrapeTimeoutSeconds(cfg) {
    const configured = resolveMrScraperPlatformConfig(cfg)?.timeoutSeconds;
    if (typeof configured === "number" && Number.isFinite(configured) && configured > 0) {
        return Math.floor(configured);
    }
    return DEFAULT_MRSCRAPER_SCRAPE_TIMEOUT_SECONDS;
}
export function resolveMrScraperGeoCode(cfg, override) {
    const candidate = (typeof override === "string" ? override.trim() : "") ||
        (typeof resolveMrScraperWebFetchConfig(cfg)?.geoCode === "string"
            ? resolveMrScraperWebFetchConfig(cfg)?.geoCode?.trim()
            : "") ||
        "";
    return candidate || undefined;
}
export function resolveMrScraperBlockResources(cfg, override) {
    if (typeof override === "boolean") {
        return override;
    }
    return resolveMrScraperWebFetchConfig(cfg)?.blockResources === true;
}
export function resolveMrScraperProxyCountry(cfg, override) {
    const candidate = (typeof override === "string" ? override.trim() : "") ||
        (typeof resolveMrScraperPlatformConfig(cfg)?.proxyCountry === "string"
            ? resolveMrScraperPlatformConfig(cfg)?.proxyCountry?.trim()
            : "") ||
        "";
    return candidate || undefined;
}
