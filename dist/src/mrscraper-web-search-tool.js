import { Type } from "@sinclair/typebox";
import { jsonResult, readNumberParam, readStringParam, } from "openclaw/plugin-sdk/provider-web-fetch";
import { runMrScraperWebSearch } from "./mrscraper-client.js";
const MrScraperWebSearchToolSchema = Type.Object({
    query: Type.String({ description: "Search query." }),
    count: Type.Optional(Type.Integer({
        description: "Number of results to return, 1 to 100. Defaults to 10.",
        minimum: 1,
        maximum: 100,
    })),
    country: Type.Optional(Type.String({ description: "Two-letter country code for the results, for example us or gb." })),
    timeoutSeconds: Type.Optional(Type.Number({
        description: "Timeout in seconds for the search request.",
        minimum: 1,
    })),
}, { additionalProperties: false });
export function createMrScraperWebSearchTool(api) {
    return {
        name: "mrscraper_web_search",
        label: "MrScraper Web Search",
        description: "Search the web with MrScraper and return up to 100 ranked results with titles, URLs, and snippets.",
        parameters: MrScraperWebSearchToolSchema,
        execute: async (_toolCallId, rawParams, signal) => jsonResult(await runMrScraperWebSearch({
            cfg: api.config,
            query: readStringParam(rawParams, "query", { required: true }),
            count: readNumberParam(rawParams, "count", { integer: true }),
            country: readStringParam(rawParams, "country"),
            timeoutSeconds: readNumberParam(rawParams, "timeoutSeconds", { integer: true }),
            signal,
        })),
    };
}
