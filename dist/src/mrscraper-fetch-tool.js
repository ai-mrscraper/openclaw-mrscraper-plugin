import { Type } from "@sinclair/typebox";
import { jsonResult, readNumberParam, readStringParam, } from "openclaw/plugin-sdk/provider-web-fetch";
import { runMrScraperFetchHtml } from "./mrscraper-client.js";
const MrScraperFetchHtmlSchema = Type.Object({
    url: Type.String({
        description: "URL of the page to scrape. Must include the protocol (https://).",
    }),
    browserRendering: Type.Optional(Type.Boolean({
        description: "Controls whether the page is loaded in a browser. Leave it out to load the page without a browser first and switch to a browser automatically if the request is blocked. Set true to always load the page in a browser, which JavaScript-heavy sites, SPAs, and pages that load content dynamically need. Set false to never use a browser.",
    })),
    timeout: Type.Optional(Type.Integer({
        description: "Maximum seconds to wait for the scrape before the request times out, from 1 to 330. Increase for slow or complex pages. Defaults to 300.",
        minimum: 1,
        maximum: 330,
    })),
    warmStart: Type.Optional(Type.Boolean({
        description: "Opens the site's home page first to warm the session before loading the target URL. Useful for sites that expect a normal browsing session before deeper pages.",
    })),
    blockResources: Type.Optional(Type.Boolean({
        description: "Blocks images, fonts, and stylesheets from loading. Speeds up scraping and reduces bandwidth usage.",
    })),
    waitForSelector: Type.Optional(Type.String({
        description: "Waits until a specific CSS selector or text appears on the page before returning it, such as #results. Up to 500 characters. Useful for content that loads asynchronously after the initial page load.",
        minLength: 1,
        maxLength: 500,
    })),
    geoCode: Type.Optional(Type.String({
        description: "Two-letter country code to load the page from, such as us or gb. Defaults to the United States.",
        pattern: "^[A-Za-z]{2}$",
    })),
    maxAge: Type.Optional(Type.Integer({
        description: "Serves a cached result of the same request when it is newer than this age, in milliseconds, such as 86400000 for 1 day. Up to 604800000 (7 days). 0, the default, always scrapes fresh. A cached result costs the same tokens as the original scrape.",
        minimum: 0,
        maximum: 604_800_000,
        default: 0,
    })),
    maxRetries: Type.Optional(Type.Integer({
        description: "Maximum number of retries for the request. Omit for no limit.",
        minimum: 0,
    })),
    screenshot: Type.Optional(Type.String({
        description: "Also captures a screenshot of the rendered page as a base64-encoded PNG: full captures the entire scroll height, top captures the first viewport, and <width>x<height> sets the viewport size in pixels with an optional -<zoom> percent, such as 1280x800 or 1920x1080-75. Width and height range from 100 to 3840, zoom from 25 to 300. Setting it forces browser rendering. Leave it out for no screenshot.",
        pattern: "^(full|top|[0-9]{3,4}x[0-9]{3,4}(-[0-9]{2,3})?)$",
    })),
    maxChars: Type.Optional(Type.Number({
        description: "Maximum characters to return.",
        minimum: 100,
    })),
}, { additionalProperties: false });
function readBooleanParam(params, key) {
    const value = params[key];
    return typeof value === "boolean" ? value : undefined;
}
export function createMrScraperFetchHtmlTool(api) {
    return {
        name: "mrscraper_fetch_html",
        label: "MrScraper Fetch HTML",
        description: "Retrieve the raw HTML of a page. Browser rendering and a screenshot are optional.",
        parameters: MrScraperFetchHtmlSchema,
        execute: async (_toolCallId, rawParams) => {
            const { screenshot, ...payload } = await runMrScraperFetchHtml({
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
            });
            const result = jsonResult(payload);
            // The screenshot goes to the model as an image, not as base64 text.
            return screenshot
                ? {
                    ...result,
                    content: [
                        ...result.content,
                        { type: "image", data: screenshot.data, mimeType: screenshot.mimeType },
                    ],
                }
                : result;
        },
    };
}
