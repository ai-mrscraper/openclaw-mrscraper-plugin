import { Type } from "@sinclair/typebox";
import type { WebFetchProviderPlugin } from "openclaw/plugin-sdk/provider-web-fetch";
import { enablePluginInConfig } from "openclaw/plugin-sdk/provider-web-fetch";
import { readMrScraperConfiguredApiToken, writeMrScraperConfiguredApiToken } from "./config.js";
import { runMrScraperFetchHtml } from "./mrscraper-client.js";

const MrScraperWebFetchSchema = Type.Object(
  {
    url: Type.String({ description: "HTTP or HTTPS URL to fetch through MrScraper." }),
    maxChars: Type.Optional(
      Type.Number({
        description: "Maximum characters to return.",
        minimum: 100,
      }),
    ),
    timeoutSeconds: Type.Optional(
      Type.Number({
        description: "Timeout in seconds for the fetch request.",
        minimum: 1,
      }),
    ),
    geoCode: Type.Optional(
      Type.String({
        description: "Optional country to load the page from, for example SG or US.",
      }),
    ),
    blockResources: Type.Optional(
      Type.Boolean({
        description: "Block images, fonts, and similar resources to speed up fetches.",
      }),
    ),
  },
  { additionalProperties: false },
);

export function createMrScraperWebFetchProvider(): WebFetchProviderPlugin {
  return {
    id: "mrscraper",
    label: "MrScraper",
    hint: "Fetch rendered pages through MrScraper.",
    envVars: ["MRSCRAPER_API_TOKEN"],
    placeholder: "atk_...",
    signupUrl: "https://mrscraper.com/",
    docsUrl: "https://mrscraper.com/",
    autoDetectOrder: 60,
    credentialPath: "plugins.entries.mrscraper.config.apiToken",
    inactiveSecretPaths: ["plugins.entries.mrscraper.config.apiToken"],
    getCredentialValue: (fetchConfig) => {
      if (!fetchConfig || typeof fetchConfig !== "object") {
        return undefined;
      }
      const scoped = (fetchConfig as { mrscraper?: { apiToken?: unknown } }).mrscraper;
      return scoped?.apiToken;
    },
    setCredentialValue: (fetchConfigTarget, value) => {
      const current =
        fetchConfigTarget.mrscraper &&
        typeof fetchConfigTarget.mrscraper === "object" &&
        !Array.isArray(fetchConfigTarget.mrscraper)
          ? (fetchConfigTarget.mrscraper as Record<string, unknown>)
          : {};
      current.apiToken = value;
      fetchConfigTarget.mrscraper = current;
    },
    getConfiguredCredentialValue: readMrScraperConfiguredApiToken,
    setConfiguredCredentialValue: writeMrScraperConfiguredApiToken,
    applySelectionConfig: (config) => enablePluginInConfig(config, "mrscraper").config,
    createTool: ({ config }) => ({
      description: "Fetch a page through MrScraper. Helpful for JavaScript-heavy pages.",
      parameters: MrScraperWebFetchSchema,
      execute: async (args) =>
        await runMrScraperFetchHtml({
          cfg: config,
          url: typeof args.url === "string" ? args.url : "",
          maxChars:
            typeof args.maxChars === "number" && Number.isFinite(args.maxChars)
              ? Math.floor(args.maxChars)
              : undefined,
          timeoutSeconds:
            typeof args.timeoutSeconds === "number" && Number.isFinite(args.timeoutSeconds)
              ? Math.floor(args.timeoutSeconds)
              : undefined,
          geoCode: typeof args.geoCode === "string" ? args.geoCode : undefined,
          blockResources:
            typeof args.blockResources === "boolean" ? args.blockResources : undefined,
          extractMode: args.extractMode === "text" ? "text" : "markdown",
        }),
    }),
  };
}
