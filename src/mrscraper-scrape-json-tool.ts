import { Type } from "@sinclair/typebox";
import type { OpenClawPluginApi } from "openclaw/plugin-sdk/plugin-runtime";
import { readNumberParam, readStringParam } from "openclaw/plugin-sdk/provider-web-fetch";
import { runMrScraperScrapeJson } from "./mrscraper-client.js";
import {
  blockResourcesParam,
  browserRenderingParam,
  geoCodeParam,
  jsonResultWithScreenshot,
  maxAgeParam,
  maxRetriesParam,
  pageUrlParam,
  readBooleanParam,
  timeoutParam,
  waitForSelectorParam,
  warmStartParam,
} from "./mrscraper-page-params.js";

const MrScraperScrapeJsonSchema = Type.Object(
  {
    url: pageUrlParam,
    prompt: Type.Optional(
      Type.String({
        description:
          'Description of the data shape you want back, for example fields like title, price, and rating. The prompt only parses the scraped content; it cannot instruct the scraper itself. To shape the output with a JSON schema, append it to the prompt as a Json Schema: section. Defaults to "Extract all data as complete as possible."',
        minLength: 1,
      }),
    ),
    html: Type.Optional(
      Type.Boolean({
        description:
          "Returns the raw HTML of the scraped page in the response. On by default; set false to leave it out.",
        default: true,
      }),
    ),
    screenshot: Type.Optional(
      Type.Boolean({
        description:
          "Captures a screenshot of the rendered page as a base64-encoded image. Useful for verifying what the scraper actually saw. Off by default.",
        default: false,
      }),
    ),
    browserRendering: browserRenderingParam,
    waitForSelector: waitForSelectorParam,
    warmStart: warmStartParam,
    blockResources: blockResourcesParam,
    timeout: timeoutParam,
    geoCode: geoCodeParam,
    maxAge: maxAgeParam,
    maxRetries: maxRetriesParam,
  },
  { additionalProperties: false },
);

export function createMrScraperScrapeJsonTool(api: OpenClawPluginApi) {
  return {
    name: "mrscraper_scrape_json",
    label: "MrScraper Scrape JSON",
    description:
      "Extract structured JSON from a page using a natural-language prompt. Append Json Schema: and a JSON schema to shape the output.",
    parameters: MrScraperScrapeJsonSchema,
    execute: async (
      _toolCallId: string,
      rawParams: Record<string, unknown>,
      signal?: AbortSignal,
    ) =>
      jsonResultWithScreenshot(
        await runMrScraperScrapeJson({
          cfg: api.config,
          url: readStringParam(rawParams, "url", { required: true }),
          prompt: readStringParam(rawParams, "prompt"),
          html: readBooleanParam(rawParams, "html"),
          screenshot: readBooleanParam(rawParams, "screenshot"),
          browserRendering: readBooleanParam(rawParams, "browserRendering"),
          waitForSelector: readStringParam(rawParams, "waitForSelector"),
          warmStart: readBooleanParam(rawParams, "warmStart"),
          blockResources: readBooleanParam(rawParams, "blockResources"),
          timeout: readNumberParam(rawParams, "timeout", { integer: true }),
          geoCode: readStringParam(rawParams, "geoCode"),
          maxAge: readNumberParam(rawParams, "maxAge", { integer: true }),
          maxRetries: readNumberParam(rawParams, "maxRetries", { integer: true }),
          signal,
        }),
      ),
  };
}
