import { Type } from "@sinclair/typebox";
import { enablePluginInConfig } from "openclaw/plugin-sdk/provider-web-fetch";
import { readMrScraperConfiguredApiToken, writeMrScraperConfiguredApiToken } from "./config.js";
import { runMrScraperWebSearch } from "./mrscraper-client.js";
// OpenClaw's web_search contract returns 1 to 10 results, 5 by default.
const DEFAULT_SEARCH_COUNT = 5;
const MAX_SEARCH_COUNT = 10;
const MrScraperWebSearchSchema = Type.Object({
    query: Type.String({ description: "Search query." }),
    count: Type.Optional(Type.Integer({
        description: "Number of results to return (1-10).",
        minimum: 1,
        maximum: MAX_SEARCH_COUNT,
    })),
    country: Type.Optional(Type.String({ description: "Two-letter country code for the results, for example us or gb." })),
}, { additionalProperties: false });
function resolveCount(requested, configured) {
    const value = [requested, configured].find((candidate) => typeof candidate === "number" && Number.isFinite(candidate));
    return value === undefined
        ? DEFAULT_SEARCH_COUNT
        : Math.min(MAX_SEARCH_COUNT, Math.max(1, Math.floor(value)));
}
export function createMrScraperWebSearchProvider() {
    return {
        id: "mrscraper",
        label: "MrScraper",
        hint: "Titles, URLs, and snippets · country filter",
        envVars: ["MRSCRAPER_API_TOKEN"],
        placeholder: "atk_...",
        signupUrl: "https://mrscraper.com/",
        docsUrl: "https://mrscraper.com/",
        autoDetectOrder: 60,
        credentialPath: "plugins.entries.mrscraper.config.apiToken",
        inactiveSecretPaths: ["plugins.entries.mrscraper.config.apiToken"],
        // The token lives in the plugin config. OpenClaw reads and writes it through the
        // configured-credential hooks, so tools.web.search holds no MrScraper key.
        getCredentialValue: () => undefined,
        setCredentialValue: () => { },
        getConfiguredCredentialValue: readMrScraperConfiguredApiToken,
        setConfiguredCredentialValue: writeMrScraperConfiguredApiToken,
        applySelectionConfig: (config) => enablePluginInConfig(config, "mrscraper").config,
        createTool: ({ config, searchConfig }) => ({
            description: "Search the web with MrScraper. Returns titles, URLs, and snippets.",
            parameters: MrScraperWebSearchSchema,
            execute: async (args, context) => await runMrScraperWebSearch({
                cfg: config,
                query: typeof args.query === "string" ? args.query : "",
                count: resolveCount(args.count, searchConfig?.maxResults),
                country: typeof args.country === "string" ? args.country : undefined,
                signal: context?.signal,
            }),
        }),
    };
}
