import { Type } from "@sinclair/typebox";
import { readNumberParam, readStringParam } from "openclaw/plugin-sdk/provider-web-fetch";
import { runMrScraperFetchHtml } from "./mrscraper-client.js";
import { blockResourcesParam, browserRenderingParam, geoCodeParam, jsonResultWithScreenshot, maxAgeParam, maxRetriesParam, pageUrlParam, readBooleanParam, SCREENSHOT_AREA_PATTERN, timeoutParam, waitForSelectorParam, warmStartParam, } from "./mrscraper-page-params.js";
const MrScraperFetchHtmlSchema = Type.Object({
    url: pageUrlParam,
    browserRendering: browserRenderingParam,
    timeout: timeoutParam,
    warmStart: warmStartParam,
    blockResources: blockResourcesParam,
    waitForSelector: waitForSelectorParam,
    geoCode: geoCodeParam,
    maxAge: maxAgeParam,
    maxRetries: maxRetriesParam,
    screenshot: Type.Optional(Type.String({
        description: "Also captures a screenshot of the rendered page as a base64-encoded PNG: full captures the entire scroll height, top captures the first viewport, and <width>x<height> sets the viewport size in pixels with an optional -<zoom> percent, such as 1280x800 or 1920x1080-75. Width and height range from 100 to 3840, zoom from 25 to 300. Setting it forces browser rendering. Leave it out for no screenshot.",
        pattern: SCREENSHOT_AREA_PATTERN,
    })),
    maxChars: Type.Optional(Type.Number({
        description: "Maximum characters to return.",
        minimum: 100,
    })),
}, { additionalProperties: false });
export function createMrScraperFetchHtmlTool(api) {
    return {
        name: "mrscraper_fetch_html",
        label: "MrScraper Fetch HTML",
        description: "Retrieve the raw HTML of a page. Browser rendering and a screenshot are optional.",
        parameters: MrScraperFetchHtmlSchema,
        execute: async (_toolCallId, rawParams) => jsonResultWithScreenshot(await runMrScraperFetchHtml({
            cfg: api.config,
            url: readStringParam(rawParams, "url", { required: true }),
            browserRendering: readBooleanParam(rawParams, "browserRendering"),
            timeout: readNumberParam(rawParams, "timeout", { integer: true }),
            warmStart: readBooleanParam(rawParams, "warmStart"),
            blockResources: readBooleanParam(rawParams, "blockResources"),
            waitForSelector: readStringParam(rawParams, "waitForSelector"),
            geoCode: readStringParam(rawParams, "geoCode"),
            maxAge: readNumberParam(rawParams, "maxAge", { integer: true }),
            maxRetries: readNumberParam(rawParams, "maxRetries", { integer: true }),
            screenshot: readStringParam(rawParams, "screenshot"),
            maxChars: readNumberParam(rawParams, "maxChars", { integer: true }),
        })),
    };
}
