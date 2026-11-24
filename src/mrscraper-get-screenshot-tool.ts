import { Type } from "@sinclair/typebox";
import type { OpenClawPluginApi } from "openclaw/plugin-sdk/plugin-runtime";
import { readNumberParam, readStringParam } from "openclaw/plugin-sdk/provider-web-fetch";
import { runMrScraperGetScreenshot } from "./mrscraper-client.js";
import {
  geoCodeParam,
  jsonResultWithScreenshot,
  maxAgeParam,
  maxRetriesParam,
  pageUrlParam,
  SCREENSHOT_AREA_PATTERN,
  timeoutParam,
  waitForSelectorParam,
} from "./mrscraper-page-params.js";

const MrScraperGetScreenshotSchema = Type.Object(
  {
    url: pageUrlParam,
    screenshot: Type.Optional(
      Type.String({
        description:
          "Screenshot area: full captures the entire scroll height (the default), top captures the first viewport, and <width>x<height> sets the viewport size in pixels with an optional -<zoom> percent, such as 1280x800 or 1920x1080-75. Width and height range from 100 to 3840, zoom from 25 to 300. The image is a base64-encoded PNG.",
        pattern: SCREENSHOT_AREA_PATTERN,
        default: "full",
      }),
    ),
    timeout: timeoutParam,
    geoCode: geoCodeParam,
    waitForSelector: waitForSelectorParam,
    maxAge: maxAgeParam,
    maxRetries: maxRetriesParam,
  },
  { additionalProperties: false },
);

export function createMrScraperGetScreenshotTool(api: OpenClawPluginApi) {
  return {
    name: "mrscraper_get_screenshot",
    label: "MrScraper Get Screenshot",
    description:
      "Capture a base64 PNG screenshot of the full page, the top viewport, or a custom viewport size. Browser rendering is always enabled.",
    parameters: MrScraperGetScreenshotSchema,
    execute: async (
      _toolCallId: string,
      rawParams: Record<string, unknown>,
      signal?: AbortSignal,
    ) =>
      jsonResultWithScreenshot(
        await runMrScraperGetScreenshot({
          cfg: api.config,
          url: readStringParam(rawParams, "url", { required: true }),
          screenshot: readStringParam(rawParams, "screenshot"),
          timeout: readNumberParam(rawParams, "timeout", { integer: true }),
          geoCode: readStringParam(rawParams, "geoCode"),
          waitForSelector: readStringParam(rawParams, "waitForSelector"),
          maxAge: readNumberParam(rawParams, "maxAge", { integer: true }),
          maxRetries: readNumberParam(rawParams, "maxRetries", { integer: true }),
          signal,
        }),
      ),
  };
}
