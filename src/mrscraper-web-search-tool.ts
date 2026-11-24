import { Type } from "@sinclair/typebox";
import type { OpenClawPluginApi } from "openclaw/plugin-sdk/plugin-runtime";
import {
  jsonResult,
  readNumberParam,
  readStringParam,
} from "openclaw/plugin-sdk/provider-web-fetch";
import { runMrScraperWebSearch } from "./mrscraper-client.js";

const MrScraperWebSearchToolSchema = Type.Object(
  {
    query: Type.String({
      description: "The search query, from 1 to 1000 characters.",
      minLength: 1,
      maxLength: 1000,
    }),
    country: Type.Optional(
      Type.String({
        description:
          "Two-letter country code to run the search from. Defaults to the United States.",
        pattern: "^[A-Za-z]{2}$",
      }),
    ),
    numResults: Type.Optional(
      Type.Integer({
        description:
          "How many results to return, from 10 to 100. The search may return fewer. Defaults to 10.",
        minimum: 10,
        maximum: 100,
      }),
    ),
  },
  { additionalProperties: false },
);

export function createMrScraperWebSearchTool(api: OpenClawPluginApi) {
  return {
    name: "mrscraper_web_search",
    label: "MrScraper Web Search",
    description:
      "Search the web and return ranked results with titles, URLs, descriptions, and sources.",
    parameters: MrScraperWebSearchToolSchema,
    execute: async (
      _toolCallId: string,
      rawParams: Record<string, unknown>,
      signal?: AbortSignal,
    ) =>
      jsonResult(
        await runMrScraperWebSearch({
          cfg: api.config,
          query: readStringParam(rawParams, "query", { required: true }),
          country: readStringParam(rawParams, "country"),
          numResults: readNumberParam(rawParams, "numResults", { integer: true }),
          signal,
        }),
      ),
  };
}
