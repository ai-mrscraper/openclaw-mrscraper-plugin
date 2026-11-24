---
name: mrscraper
description: MrScraper web search, page, screenshot, and AI scraping tools for search results, page HTML and Markdown, screenshots, brand data, and structured extraction.
metadata:
  { "openclaw": { "emoji": "🕸️", "requires": { "config": ["plugins.entries.mrscraper.enabled"] } } }
---

# MrScraper Tools

## When to use which tool

| Need                              | Tool                                  | When                                                                |
| --------------------------------- | ------------------------------------- | ------------------------------------------------------------------- |
| Web search                        | `web_search`                          | MrScraper is the selected `web_search` provider                     |
| Up to 100 search results          | `mrscraper_web_search`                | Need more than 10 results                                           |
| JS-heavy page fetch               | `web_fetch`                           | MrScraper can back up `web_fetch` in non-sandboxed sessions         |
| Raw HTML plus extracted text      | `mrscraper_fetch_html`                | Need page options such as `waitForSelector`, `geoCode`, or a screenshot |
| Page as Markdown                  | `mrscraper_scrape_markdown`           | Need readable page content with page options                        |
| Page screenshot                   | `mrscraper_get_screenshot`            | Need to see the full page, the first viewport, or a set viewport    |
| Brand colors, fonts, and logos    | `mrscraper_scrape_brand`              | Need a website's brand assets and social links                      |
| Structured JSON from one page     | `mrscraper_scrape_json`               | Need fields from one page, optionally shaped by a JSON schema       |
| AI-powered structured extraction  | `mrscraper_scrape`                    | Need a reusable AI scraper from plain-language instructions         |
| Reuse an AI scraper               | `mrscraper_rerun_ai_scraper`          | Apply an existing AI scraper to a new page or crawl target          |
| Batch AI reruns                   | `mrscraper_bulk_rerun_ai_scraper`     | Reuse one AI scraper across many URLs                               |
| Reuse a manual scraper            | `mrscraper_rerun_manual_scraper`      | Apply a dashboard manual scraper to a new URL                       |
| Batch manual reruns               | `mrscraper_bulk_rerun_manual_scraper` | Reuse one manual scraper across many URLs                           |
| Browse prior runs                 | `mrscraper_get_all_results`           | List stored results with sorting, paging, and filters               |
| Inspect one prior run             | `mrscraper_get_result_by_id`          | Fetch one detailed result by result ID                              |

## web_search

When `mrscraper` is the selected `web_search` provider, `web_search` returns
titles, URLs, and snippets from MrScraper.

| Parameter | Description |
| --- | --- |
| `query` | The search query, from 1 to 1000 characters. |
| `count` | Results to return, 1 to 10. |
| `country` | Two-letter country code to run the search from. Defaults to the United States. |

## mrscraper_web_search

Search the web and return ranked results with titles, URLs, descriptions, and
sources. Use this when you need more than 10 results.

| Parameter | Description |
| --- | --- |
| `query` | The search query, from 1 to 1000 characters. Required. |
| `country` | Two-letter country code to run the search from. Defaults to the United States. |
| `numResults` | How many results to return, from 10 to 100. The search may return fewer. Defaults to 10. |

## web_fetch

When `mrscraper` is the selected `web_fetch` provider in a non-sandboxed session,
OpenClaw tries local extraction first and calls MrScraper if it fails or
Readability is disabled. Sandboxed `web_fetch` does not load third-party fetch
providers. Use `mrscraper_fetch_html` when the agent's tool policy allows it.

| Parameter | Description |
| --- | --- |
| `url` | URL of the page to scrape. Must include the protocol (https://). |
| `maxChars` | Maximum characters to return. |

The page settings in `plugins.entries.mrscraper.config.webFetch` (`timeoutSeconds`,
`geoCode`, `blockResources`) apply when they are set.

## mrscraper_fetch_html

Retrieve the raw HTML of a page. Browser rendering and a screenshot are optional.
The result holds the HTML, the page title, and the extracted text; a screenshot
comes back as an image.

| Parameter | Description |
| --- | --- |
| `url` | URL of the page to scrape. Must include the protocol (https://). Required. |
| `browserRendering` | Controls whether the page is loaded in a browser. Leave it out to load the page without a browser first and switch to a browser automatically if the request is blocked. Set true to always load the page in a browser, which JavaScript-heavy sites, SPAs, and pages that load content dynamically need. Set false to never use a browser. |
| `timeout` | Maximum seconds to wait for the scrape before the request times out, from 1 to 330. Increase for slow or complex pages. Defaults to 300. |
| `warmStart` | Opens the site's home page first to warm the session before loading the target URL. Useful for sites that expect a normal browsing session before deeper pages. |
| `blockResources` | Blocks images, fonts, and stylesheets from loading. Speeds up scraping and reduces bandwidth usage. |
| `waitForSelector` | Waits until a specific CSS selector or text appears on the page before returning it, such as #results. Up to 500 characters. Useful for content that loads asynchronously after the initial page load. |
| `geoCode` | Two-letter country code to load the page from, such as us or gb. Defaults to the United States. |
| `maxAge` | Serves a cached result of the same request when it is newer than this age, in milliseconds, such as 86400000 for 1 day. Up to 604800000 (7 days). 0, the default, always scrapes fresh. A cached result costs the same tokens as the original scrape. |
| `maxRetries` | Maximum number of retries for the request. Omit for no limit. |
| `screenshot` | Also captures a screenshot of the rendered page as a base64-encoded PNG: `full` captures the entire scroll height, `top` captures the first viewport, and `<width>x<height>` sets the viewport size in pixels with an optional `-<zoom>` percent, such as `1280x800` or `1920x1080-75`. Width and height range from 100 to 3840, zoom from 25 to 300. Setting it forces browser rendering. Leave it out for no screenshot. |
| `maxChars` | Maximum characters to return. |

Leave out the inputs you do not need: they are not sent, and MrScraper's defaults
apply. Every page request (`web_fetch`, `mrscraper_fetch_html`,
`mrscraper_scrape_markdown`, `mrscraper_get_screenshot`, and
`mrscraper_scrape_json`) sends `maxAge` (0 unless set) and `saveResult=true`, so
each page is saved to the MrScraper account's results. This tool also sends
`html=true` and `markdown=false`.

## mrscraper_scrape_markdown

Retrieve a page as Markdown. Browser rendering is optional. Requests also send
`markdown=true`, `html=false`, and `screenshot=false`.

| Parameter | Description |
| --- | --- |
| `url` | URL of the page to scrape. Must include the protocol (https://). Required. |
| `browserRendering` | Controls whether the page is loaded in a browser. Leave it out to load the page without a browser first and switch to a browser automatically if the request is blocked. Set true to always load the page in a browser, which JavaScript-heavy sites, SPAs, and pages that load content dynamically need. Set false to never use a browser. |
| `timeout` | Maximum seconds to wait for the scrape before the request times out, from 1 to 330. Increase for slow or complex pages. Defaults to 300. |
| `geoCode` | Two-letter country code to load the page from, such as us or gb. Defaults to the United States. |
| `warmStart` | Opens the site's home page first to warm the session before loading the target URL. Useful for sites that expect a normal browsing session before deeper pages. |
| `blockResources` | Blocks images, fonts, and stylesheets from loading. Speeds up scraping and reduces bandwidth usage. |
| `waitForSelector` | Waits until a specific CSS selector or text appears on the page before returning it, such as #results. Up to 500 characters. Useful for content that loads asynchronously after the initial page load. |
| `maxAge` | Serves a cached result of the same request when it is newer than this age, in milliseconds, such as 86400000 for 1 day. Up to 604800000 (7 days). 0, the default, always scrapes fresh. A cached result costs the same tokens as the original scrape. |
| `maxRetries` | Maximum number of retries for the request. Omit for no limit. |

## mrscraper_get_screenshot

Capture a base64 PNG screenshot of the full page, the top viewport, or a custom
viewport size. Browser rendering is always enabled. The screenshot comes back as
an image. Requests also send `browserRendering=true`, `html=false`, and
`markdown=false`.

| Parameter | Description |
| --- | --- |
| `url` | URL of the page to scrape. Must include the protocol (https://). Required. |
| `screenshot` | Screenshot area: `full` captures the entire scroll height (the default), `top` captures the first viewport, and `<width>x<height>` sets the viewport size in pixels with an optional `-<zoom>` percent, such as `1280x800` or `1920x1080-75`. Width and height range from 100 to 3840, zoom from 25 to 300. The image is a base64-encoded PNG. |
| `timeout` | Maximum seconds to wait for the scrape before the request times out, from 1 to 330. Increase for slow or complex pages. Defaults to 300. |
| `geoCode` | Two-letter country code to load the page from, such as us or gb. Defaults to the United States. |
| `waitForSelector` | Waits until a specific CSS selector or text appears on the page before returning it, such as #results. Up to 500 characters. Useful for content that loads asynchronously after the initial page load. |
| `maxAge` | Serves a cached result of the same request when it is newer than this age, in milliseconds, such as 86400000 for 1 day. Up to 604800000 (7 days). 0, the default, always scrapes fresh. A cached result costs the same tokens as the original scrape. |
| `maxRetries` | Maximum number of retries for the request. Omit for no limit. |

## mrscraper_scrape_brand

Extract a website's colors, typography, logos, and social links as JSON. The
brand is in `data.brand`. Requests send `action=brand-scraping` and
`bundle=none` with the URL.

| Parameter | Description |
| --- | --- |
| `url` | URL of the page to scrape. Must include the protocol (https://). Required. |

## mrscraper_scrape_json

Extract structured JSON from a page using a natural-language prompt. Append Json
Schema: and a JSON schema to shape the output. The extracted data is in `data`,
and a screenshot comes back as an image. Requests also send `agent=general`.

| Parameter | Description |
| --- | --- |
| `url` | URL of the page to scrape. Must include the protocol (https://). Required. |
| `prompt` | Description of the data shape you want back, for example fields like title, price, and rating. The prompt only parses the scraped content; it cannot instruct the scraper itself. To shape the output with a JSON schema, append it to the prompt as a Json Schema: section. Defaults to "Extract all data as complete as possible." |
| `html` | Returns the raw HTML of the scraped page in the response. On by default; set false to leave it out. |
| `screenshot` | Captures a screenshot of the rendered page as a base64-encoded image. Useful for verifying what the scraper actually saw. Off by default. |
| `browserRendering` | Controls whether the page is loaded in a browser. Leave it out to load the page without a browser first and switch to a browser automatically if the request is blocked. Set true to always load the page in a browser, which JavaScript-heavy sites, SPAs, and pages that load content dynamically need. Set false to never use a browser. |
| `waitForSelector` | Waits until a specific CSS selector or text appears on the page before returning it, such as #results. Up to 500 characters. Useful for content that loads asynchronously after the initial page load. |
| `warmStart` | Opens the site's home page first to warm the session before loading the target URL. Useful for sites that expect a normal browsing session before deeper pages. |
| `blockResources` | Blocks images, fonts, and stylesheets from loading. Speeds up scraping and reduces bandwidth usage. |
| `timeout` | Maximum seconds to wait for the scrape before the request times out, from 1 to 330. Increase for slow or complex pages. Defaults to 300. |
| `geoCode` | Two-letter country code to load the page from, such as us or gb. Defaults to the United States. |
| `maxAge` | Serves a cached result of the same request when it is newer than this age, in milliseconds, such as 86400000 for 1 day. Up to 604800000 (7 days). 0, the default, always scrapes fresh. A cached result costs the same tokens as the original scrape. |
| `maxRetries` | Maximum number of retries for the request. Omit for no limit. |

## mrscraper_scrape

Use this when you want MrScraper to create an AI scraper run from natural-language
instructions.

| Parameter         | Description                                    |
| ----------------- | ---------------------------------------------- |
| `url`             | Target page or site                            |
| `message`         | What to extract                                |
| `agent`           | `general`, `listing`, or `map`                 |
| `proxyCountry`    | Optional ISO country code                      |
| `maxDepth`        | `map` agent only                               |
| `maxPages`        | `map` agent only                               |
| `limit`           | `map` agent only                               |
| `includePatterns` | `map` agent only; regex patterns joined with `\|\|` |
| `excludePatterns` | `map` agent only; regex patterns joined with `\|\|` |

## mrscraper_rerun_ai_scraper

Reuse an existing AI scraper on a new URL.

| Parameter         | Description                                    |
| ----------------- | ---------------------------------------------- |
| `scraperId`       | Existing AI scraper ID                         |
| `url`             | Target page or site                            |
| `maxDepth`        | `map` agent only                               |
| `maxPages`        | `map` agent only                               |
| `limit`           | `map` agent only                               |
| `includePatterns` | `map` agent only; regex patterns joined with `\|\|` |
| `excludePatterns` | `map` agent only; regex patterns joined with `\|\|` |

## mrscraper_bulk_rerun_ai_scraper

Reuse an existing AI scraper across multiple URLs.

| Parameter   | Description             |
| ----------- | ----------------------- |
| `scraperId` | Existing AI scraper ID  |
| `urls`      | One or more target URLs |

## mrscraper_rerun_manual_scraper

Reuse an existing manual scraper on a new URL.

| Parameter   | Description                |
| ----------- | -------------------------- |
| `scraperId` | Existing manual scraper ID |
| `url`       | Target page or site        |

## mrscraper_bulk_rerun_manual_scraper

Reuse an existing manual scraper across multiple URLs.

| Parameter   | Description                |
| ----------- | -------------------------- |
| `scraperId` | Existing manual scraper ID |
| `urls`      | One or more target URLs    |

## mrscraper_get_all_results

Browse previous MrScraper runs with optional paging and filtering.

| Parameter         | Description                      |
| ----------------- | -------------------------------- |
| `sortField`       | Sort column such as `updatedAt`  |
| `sortOrder`       | `ASC` or `DESC`                  |
| `pageSize`        | Number of results per page       |
| `page`            | Page number starting at 1        |
| `search`          | Optional text search             |
| `dateRangeColumn` | Optional date field to filter by |
| `startAt`         | Optional ISO start timestamp     |
| `endAt`           | Optional ISO end timestamp       |

## mrscraper_get_result_by_id

Fetch one detailed result object by result ID.

| Parameter  | Description        |
| ---------- | ------------------ |
| `resultId` | Result ID to fetch |

## Tips

- Use `web_search` or `mrscraper_web_search` to find pages, then fetch or scrape the ones you need.
- Start with `web_fetch` in a non-sandboxed session, `mrscraper_scrape_markdown`, or `mrscraper_fetch_html` when you mainly need page contents.
- Use `mrscraper_scrape_json` for structured data from one page, and `mrscraper_scrape` to create a reusable AI scraper.
- Use the rerun tools once you already have a saved scraper ID and want to reuse it.
- Use the result tools when you need to inspect prior jobs rather than launch a new scrape.
- Prefer the `map` agent only when the task really needs multi-page crawling.
