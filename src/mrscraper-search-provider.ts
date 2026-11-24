import { Type } from "@sinclair/typebox";
import type { OpenClawPluginApi } from "openclaw/plugin-sdk/plugin-runtime";
import { enablePluginInConfig } from "openclaw/plugin-sdk/provider-web-fetch";
import { readMrScraperConfiguredApiToken, writeMrScraperConfiguredApiToken } from "./config.js";
import { runMrScraperWebSearch } from "./mrscraper-client.js";

type WebSearchProviderPlugin = Parameters<OpenClawPluginApi["registerWebSearchProvider"]>[0];

// OpenClaw's web_search contract returns 1 to 10 results, 5 by default. The API returns up to 10
// when numResults is left out, so the provider sends no numResults and keeps the first `count`.
const DEFAULT_SEARCH_COUNT = 5;
const MAX_SEARCH_COUNT = 10;

const MrScraperWebSearchSchema = Type.Object(
  {
    query: Type.String({
      description: "The search query, from 1 to 1000 characters.",
      minLength: 1,
      maxLength: 1000,
    }),
    count: Type.Optional(
      Type.Integer({
        description: "Number of results to return (1-10).",
        minimum: 1,
        maximum: MAX_SEARCH_COUNT,
      }),
    ),
    country: Type.Optional(
      Type.String({
        description:
          "Two-letter country code to run the search from. Defaults to the United States.",
        pattern: "^[A-Za-z]{2}$",
      }),
    ),
  },
  { additionalProperties: false },
);

function resolveCount(requested: unknown, configured: unknown): number {
  const value = [requested, configured].find(
    (candidate): candidate is number => typeof candidate === "number" && Number.isFinite(candidate),
  );
  return value === undefined
    ? DEFAULT_SEARCH_COUNT
    : Math.min(MAX_SEARCH_COUNT, Math.max(1, Math.floor(value)));
}

export function createMrScraperWebSearchProvider(): WebSearchProviderPlugin {
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
    setCredentialValue: () => {},
    getConfiguredCredentialValue: readMrScraperConfiguredApiToken,
    setConfiguredCredentialValue: writeMrScraperConfiguredApiToken,
    applySelectionConfig: (config) => enablePluginInConfig(config, "mrscraper").config,
    createTool: ({ config, searchConfig }) => ({
      description:
        "Search the web and return ranked results with titles, URLs, descriptions, and sources.",
      parameters: MrScraperWebSearchSchema,
      execute: async (args, context) =>
        await runMrScraperWebSearch({
          cfg: config,
          query: typeof args.query === "string" ? args.query : "",
          count: resolveCount(args.count, searchConfig?.maxResults),
          country: typeof args.country === "string" ? args.country : undefined,
          signal: context?.signal,
        }),
    }),
  };
}
