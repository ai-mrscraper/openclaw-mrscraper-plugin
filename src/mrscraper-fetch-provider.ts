import { Type } from "@sinclair/typebox";
import type { WebFetchProviderPlugin } from "openclaw/plugin-sdk/provider-web-fetch";
import { enablePluginInConfig } from "openclaw/plugin-sdk/provider-web-fetch";
import { readMrScraperConfiguredApiToken, writeMrScraperConfiguredApiToken } from "./config.js";
import { runMrScraperFetchHtml } from "./mrscraper-client.js";

// OpenClaw's web_fetch hands its fallback provider url, extractMode, and maxChars. Page settings
// come from plugins.entries.mrscraper.config.webFetch.
const MrScraperWebFetchSchema = Type.Object(
  {
    url: Type.String({
      description: "URL of the page to scrape. Must include the protocol (https://).",
    }),
    maxChars: Type.Optional(
      Type.Number({
        description: "Maximum characters to return.",
        minimum: 100,
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
          extractMode: args.extractMode === "text" ? "text" : "markdown",
        }),
    }),
  };
}
