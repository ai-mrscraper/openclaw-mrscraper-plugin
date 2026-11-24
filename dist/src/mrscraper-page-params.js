import { Type } from "@sinclair/typebox";
import { jsonResult } from "openclaw/plugin-sdk/provider-web-fetch";
// Page inputs of the MrScraper Scraper API, described as in the API docs.
export const SCREENSHOT_AREA_PATTERN = "^(full|top|[0-9]{3,4}x[0-9]{3,4}(-[0-9]{2,3})?)$";
export const pageUrlParam = Type.String({
    description: "URL of the page to scrape. Must include the protocol (https://).",
});
export const browserRenderingParam = Type.Optional(Type.Boolean({
    description: "Controls whether the page is loaded in a browser. Leave it out to load the page without a browser first and switch to a browser automatically if the request is blocked. Set true to always load the page in a browser, which JavaScript-heavy sites, SPAs, and pages that load content dynamically need. Set false to never use a browser.",
}));
export const timeoutParam = Type.Optional(Type.Integer({
    description: "Maximum seconds to wait for the scrape before the request times out, from 1 to 330. Increase for slow or complex pages. Defaults to 300.",
    minimum: 1,
    maximum: 330,
}));
export const warmStartParam = Type.Optional(Type.Boolean({
    description: "Opens the site's home page first to warm the session before loading the target URL. Useful for sites that expect a normal browsing session before deeper pages.",
}));
export const blockResourcesParam = Type.Optional(Type.Boolean({
    description: "Blocks images, fonts, and stylesheets from loading. Speeds up scraping and reduces bandwidth usage.",
}));
export const waitForSelectorParam = Type.Optional(Type.String({
    description: "Waits until a specific CSS selector or text appears on the page before returning it, such as #results. Up to 500 characters. Useful for content that loads asynchronously after the initial page load.",
    minLength: 1,
    maxLength: 500,
}));
export const geoCodeParam = Type.Optional(Type.String({
    description: "Two-letter country code to load the page from, such as us or gb. Defaults to the United States.",
    pattern: "^[A-Za-z]{2}$",
}));
export const maxAgeParam = Type.Optional(Type.Integer({
    description: "Serves a cached result of the same request when it is newer than this age, in milliseconds, such as 86400000 for 1 day. Up to 604800000 (7 days). 0, the default, always scrapes fresh. A cached result costs the same tokens as the original scrape.",
    minimum: 0,
    maximum: 604_800_000,
    default: 0,
}));
export const maxRetriesParam = Type.Optional(Type.Integer({
    description: "Maximum number of retries for the request. Omit for no limit.",
    minimum: 0,
}));
export function readBooleanParam(params, key) {
    const value = params[key];
    return typeof value === "boolean" ? value : undefined;
}
/** The JSON tool result, with a screenshot sent to the model as an image rather than base64 text. */
export function jsonResultWithScreenshot(result) {
    const { screenshot, ...payload } = result;
    const json = jsonResult(payload);
    return screenshot
        ? {
            ...json,
            content: [
                ...json.content,
                { type: "image", data: screenshot.data, mimeType: screenshot.mimeType },
            ],
        }
        : json;
}
