import { Type } from "@sinclair/typebox";
import type { OpenClawPluginApi } from "openclaw/plugin-sdk/plugin-runtime";
import {
  jsonResult,
  readNumberParam,
  readStringParam,
} from "openclaw/plugin-sdk/provider-web-fetch";
import { runMrScraperScrapeMarkdown } from "./mrscraper-client.js";
import {
  blockResourcesParam,
  browserRenderingParam,
  geoCodeParam,
  maxAgeParam,
  maxRetriesParam,
  pageUrlParam,
  readBooleanParam,
  timeoutParam,
  waitForSelectorParam,
  warmStartParam,
} from "./mrscraper-page-params.js";

const MrScraperScrapeMarkdownSchema = Type.Object(
  {
    url: pageUrlParam,
    browserRendering: browserRenderingParam,
    timeout: timeoutParam,
    geoCode: geoCodeParam,
    warmStart: warmStartParam,
    blockResources: blockResourcesParam,
    waitForSelector: waitForSelectorParam,
    maxAge: maxAgeParam,
    maxRetries: maxRetriesParam,
  },
  { additionalProperties: false },
);

export function createMrScraperScrapeMarkdownTool(api: OpenClawPluginApi) {
  return {
    name: "mrscraper_scrape_markdown",
    label: "MrScraper Scrape Markdown",
    description: "Retrieve a page as Markdown. Browser rendering is optional.",
    parameters: MrScraperScrapeMarkdownSchema,
    execute: async (
      _toolCallId: string,
      rawParams: Record<string, unknown>,
      signal?: AbortSignal,
    ) =>
      jsonResult(
        await runMrScraperScrapeMarkdown({
          cfg: api.config,
          url: readStringParam(rawParams, "url", { required: true }),
          browserRendering: readBooleanParam(rawParams, "browserRendering"),
          timeout: readNumberParam(rawParams, "timeout", { integer: true }),
          geoCode: readStringParam(rawParams, "geoCode"),
          warmStart: readBooleanParam(rawParams, "warmStart"),
          blockResources: readBooleanParam(rawParams, "blockResources"),
          waitForSelector: readStringParam(rawParams, "waitForSelector"),
          maxAge: readNumberParam(rawParams, "maxAge", { integer: true }),
          maxRetries: readNumberParam(rawParams, "maxRetries", { integer: true }),
          signal,
        }),
      ),
  };
}
