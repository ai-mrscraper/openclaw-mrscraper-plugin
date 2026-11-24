# MrScraper for OpenClaw

Community plugin that adds MrScraper as a `web_search` provider and a `web_fetch` fallback, plus tools for web search, page HTML and Markdown, screenshots, brand and JSON extraction, AI scraping, reruns, and saved results. It sends search queries, target URLs, and extraction requests to MrScraper's hosted APIs. A MrScraper account and API token are required.

The existing [MrScraper ClawHub skill](https://clawhub.ai/ai-mrscraper/skills/mrscraper) provides agent instructions for direct API use. This package registers native OpenClaw tools plus `web_search` and `web_fetch` providers. It is community-maintained and is not an official OpenClaw plugin.

## Install

Install from ClawHub:

```bash
openclaw plugins install clawhub:@ai-mrscraper/openclaw-mrscraper
```

Review and accept the plugin's requested capabilities when prompted. For an unattended install, add `--accept-capabilities` after reviewing the package and its declared thirteen tools and `web_search` and `web_fetch` providers.

For local development, install this directory as a local plugin with `openclaw plugins install ./path/to/openclaw-mrscraper-plugin`.

## Configure

Create an API token in the [MrScraper dashboard](https://mrscraper.com/). Set `MRSCRAPER_API_TOKEN` in the Gateway environment, then select MrScraper as the `web_search` provider, the `web_fetch` fallback, or both:

```json5
{
  plugins: {
    entries: {
      mrscraper: { enabled: true },
    },
  },
  tools: {
    web: {
      search: { provider: "mrscraper" },
      fetch: { provider: "mrscraper" },
    },
  },
}
```

You can instead store the token in `plugins.entries.mrscraper.config.apiToken`. Keep the token out of source control and logs. Other optional settings:

- `webSearch`: `country`, a two-letter code such as `us` for searches that set none, and `timeoutSeconds`, how long to wait for a search (default 60).
- `webFetch`: `timeoutSeconds` (the page `timeout`, 1 to 330), `geoCode`, and `blockResources`, used by `mrscraper_fetch_html` and the `web_fetch` fallback when a fetch sets none. The `web_fetch` fallback takes its page settings only from here.
- `platform`: `timeoutSeconds` and `proxyCountry` for the AI scraper, rerun, and result tools.

Settings you leave empty are not sent, so MrScraper's defaults apply. Custom API base URLs must use the allowlisted MrScraper HTTPS hosts.

`web_search` returns 1 to 10 results: 5 by default, or `tools.web.search.maxResults` when set. MrScraper returns up to 10 results per search unless more are requested, and `web_search` keeps the first ones it needs. For up to 100 results, use `mrscraper_web_search` with `numResults`.

In non-sandboxed sessions, `web_fetch` first tries OpenClaw's local extraction. It calls the selected MrScraper provider when that extraction fails or Readability is disabled. Sandboxed `web_fetch` currently does not load third-party fetch providers. For an explicit MrScraper fetch, use `mrscraper_fetch_html` when your agent's tool policy allows it.

The page tools (`mrscraper_fetch_html`, `mrscraper_scrape_markdown`, `mrscraper_get_screenshot`, and `mrscraper_scrape_json`) and the `web_fetch` fallback call MrScraper's [Scraper API](https://docs.mrscraper.com/docs/api/overview). Every page request sends `maxAge` (0, which always scrapes fresh, unless set) and `saveResult=true`, so each page is also saved to your MrScraper results, plus fixed values for its service:

- `mrscraper_fetch_html` and `web_fetch`: `html=true`, `markdown=false`.
- `mrscraper_scrape_markdown`: `markdown=true`, `html=false`, `screenshot=false`.
- `mrscraper_get_screenshot`: `browserRendering=true`, `html=false`, `markdown=false`, and `screenshot=full` unless set.
- `mrscraper_scrape_json`: `agent=general`, and `html=true` and `screenshot=false` unless set. A request URL over 8,000 characters is sent by POST, with `url`, `prompt`, and `agent` in the JSON body.

`mrscraper_scrape_brand` sends `action=brand-scraping`, the `url`, and `bundle=none`. Other inputs are sent only when set. A page request waits for its `timeout` (300 seconds when unset) plus 30 seconds; a brand request waits up to 120 seconds.

Verify that OpenClaw loaded the plugin with `openclaw plugins inspect mrscraper --runtime` and `openclaw plugins doctor`. Then ask your agent to search with `web_search`, fetch a URL with `web_fetch`, retrieve a page's raw HTML with `mrscraper_fetch_html`, or extract structured data with `mrscraper_scrape_json` or `mrscraper_scrape`.

## Tools

| Tool | Purpose |
| --- | --- |
| `mrscraper_web_search` | Search the web and return ranked results with titles, URLs, descriptions, and sources, 10 to 100 per search |
| `mrscraper_fetch_html` | Retrieve the raw HTML of a page, with its title and extracted text. Browser rendering and a screenshot are optional |
| `mrscraper_scrape_markdown` | Retrieve a page as Markdown. Browser rendering is optional |
| `mrscraper_get_screenshot` | Capture a base64 PNG screenshot of the full page, the top viewport, or a custom viewport size. Browser rendering is always enabled |
| `mrscraper_scrape_brand` | Extract a website's colors, typography, logos, and social links as JSON |
| `mrscraper_scrape_json` | Extract structured JSON from a page using a natural-language prompt. Append `Json Schema:` and a JSON schema to shape the output |
| `mrscraper_scrape` | Start an AI scraper from a URL and natural-language request |
| `mrscraper_rerun_ai_scraper` | Rerun a saved AI scraper on one URL |
| `mrscraper_bulk_rerun_ai_scraper` | Rerun a saved AI scraper on multiple URLs |
| `mrscraper_rerun_manual_scraper` | Rerun a saved manual scraper on one URL |
| `mrscraper_bulk_rerun_manual_scraper` | Rerun a saved manual scraper on multiple URLs |
| `mrscraper_get_all_results` | List stored results |
| `mrscraper_get_result_by_id` | Retrieve one stored result |

Tool inputs, in order (only `url` and `query` are required):

- `mrscraper_fetch_html`: `url`, `browserRendering`, `timeout`, `warmStart`, `blockResources`, `waitForSelector`, `geoCode`, `maxAge`, `maxRetries`, `screenshot`, plus `maxChars`, which limits the characters returned to the agent.
- `mrscraper_scrape_markdown`: `url`, `browserRendering`, `timeout`, `geoCode`, `warmStart`, `blockResources`, `waitForSelector`, `maxAge`, `maxRetries`.
- `mrscraper_get_screenshot`: `url`, `screenshot` (default `full`), `timeout`, `geoCode`, `waitForSelector`, `maxAge`, `maxRetries`.
- `mrscraper_scrape_brand`: `url`.
- `mrscraper_scrape_json`: `url`, `prompt`, `html` (default true), `screenshot` (default false), `browserRendering`, `waitForSelector`, `warmStart`, `blockResources`, `timeout`, `geoCode`, `maxAge`, `maxRetries`.
- `mrscraper_web_search`: `query`, `country`, `numResults` (10 to 100).

A `screenshot` area is `full`, `top`, or `<width>x<height>` with an optional `-<zoom>`, such as `1280x800` or `1920x1080-75` (width and height 100 to 3840, zoom 25 to 300).

The platform tools, `mrscraper_scrape_brand`, and `mrscraper_scrape_json` return their API response in an untrusted-content envelope. Treat scraped text as data, not instructions. `web_search` and `mrscraper_web_search` wrap each result's title and snippet the same way. `mrscraper_fetch_html` returns HTML and extracted text in separate fields, and `mrscraper_scrape_markdown` the Markdown. Screenshots from `mrscraper_fetch_html`, `mrscraper_get_screenshot`, and `mrscraper_scrape_json` come back as images. `web_fetch` returns Markdown or plain text according to `extractMode`.

MrScraper receives the search queries, target URLs, and any extraction instructions sent to its hosted API, and keeps each fetched page in your account's results. MrScraper usage may consume your account's quota. Review the [MrScraper API docs](https://docs.mrscraper.com/docs/api/overview) before using sensitive targets or large batches.

## Development

```bash
pnpm install
pnpm test
pnpm typecheck
pnpm build
```

To preview a ClawHub publication without uploading:

```bash
clawhub package publish ./ --dry-run
```

See the [OpenClaw plugin guide](https://docs.openclaw.ai/plugins/building-plugins), [ClawHub guide](https://docs.openclaw.ai/tools/clawhub), and [MrScraper API authentication guide](https://docs.mrscraper.com/docs/api/authentication).
