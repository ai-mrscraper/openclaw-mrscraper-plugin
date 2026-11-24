import { Type } from "@sinclair/typebox";
import { jsonResult, readStringParam } from "openclaw/plugin-sdk/provider-web-fetch";
import { runMrScraperScrapeBrand } from "./mrscraper-client.js";
import { pageUrlParam } from "./mrscraper-page-params.js";
const MrScraperScrapeBrandSchema = Type.Object({
    url: pageUrlParam,
}, { additionalProperties: false });
export function createMrScraperScrapeBrandTool(api) {
    return {
        name: "mrscraper_scrape_brand",
        label: "MrScraper Scrape Brand",
        description: "Extract a website's colors, typography, logos, and social links as JSON.",
        parameters: MrScraperScrapeBrandSchema,
        execute: async (_toolCallId, rawParams, signal) => jsonResult(await runMrScraperScrapeBrand({
            cfg: api.config,
            url: readStringParam(rawParams, "url", { required: true }),
            signal,
        })),
    };
}
