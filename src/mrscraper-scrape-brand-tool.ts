import { Type } from "@sinclair/typebox";
import type { OpenClawPluginApi } from "openclaw/plugin-sdk/plugin-runtime";
import { jsonResult, readStringParam } from "openclaw/plugin-sdk/provider-web-fetch";
import { runMrScraperScrapeBrand } from "./mrscraper-client.js";
import { pageUrlParam } from "./mrscraper-page-params.js";

const MrScraperScrapeBrandSchema = Type.Object(
  {
    url: pageUrlParam,
  },
  { additionalProperties: false },
);

export function createMrScraperScrapeBrandTool(api: OpenClawPluginApi) {
  return {
    name: "mrscraper_scrape_brand",
    label: "MrScraper Scrape Brand",
    description:
      "Extract a website's colors, typography, logos, and social links as JSON.",
    parameters: MrScraperScrapeBrandSchema,
    execute: async (
      _toolCallId: string,
      rawParams: Record<string, unknown>,
      signal?: AbortSignal,
    ) =>
      jsonResult(
        await runMrScraperScrapeBrand({
          cfg: api.config,
          url: readStringParam(rawParams, "url", { required: true }),
          signal,
        }),
      ),
  };
}
