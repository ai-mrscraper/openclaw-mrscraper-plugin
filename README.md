# MrScraper for OpenClaw

Community plugin that adds MrScraper as a `web_search` provider and a `web_fetch` fallback, plus tools for web search, raw page HTML, AI scraping, reruns, and saved results. It sends search queries, target URLs, and extraction requests to MrScraper's hosted APIs. A MrScraper account and API token are required.

The existing [MrScraper ClawHub skill](https://clawhub.ai/ai-mrscraper/skills/mrscraper) provides agent instructions for direct API use. This package registers native OpenClaw tools plus `web_search` and `web_fetch` providers. It is community-maintained and is not an official OpenClaw plugin.

## Install

Install from ClawHub:

```bash
openclaw plugins install clawhub:@ai-mrscraper/openclaw-mrscraper
```

Review and accept the plugin's requested capabilities when prompted. For an unattended install, add `--accept-capabilities` after reviewing the package and its declared nine tools and `web_search` and `web_fetch` providers.

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
- `webFetch`: `timeoutSeconds` (the page `timeout`, 1 to 330), `geoCode`, and `blockResources`, used when a fetch sets none. The `web_fetch` fallback takes its page settings only from here.
- `platform`: `timeoutSeconds` and `proxyCountry` for the AI scraper, rerun, and result tools.

Settings you leave empty are not sent, so MrScraper's defaults apply. Custom API base URLs must use the allowlisted MrScraper HTTPS hosts.

`web_search` returns 1 to 10 results: 5 by default, or `tools.web.search.maxResults` when set. MrScraper returns up to 10 results per search unless more are requested, and `web_search` keeps the first ones it needs. For up to 100 results, use `mrscraper_web_search` with `numResults`.

In non-sandboxed sessions, `web_fetch` first tries OpenClaw's local extraction. It calls the selected MrScraper provider when that extraction fails or Readability is disabled. Sandboxed `web_fetch` currently does not load third-party fetch providers. For an explicit MrScraper fetch, use `mrscraper_fetch_html` when your agent's tool policy allows it.

`mrscraper_fetch_html` and the `web_fetch` fallback call MrScraper's [Scrape HTML API](https://docs.mrscraper.com/docs/api/scraper-api/scrape-html). Every request sends `maxAge` (0, which always scrapes fresh, unless set), `html=true`, `markdown=false`, and `saveResult=true`, so each fetched page is also saved to your MrScraper results. Other inputs are sent only when set. A fetch waits for its `timeout` (300 seconds when unset) plus 30 seconds.

Verify that OpenClaw loaded the plugin with `openclaw plugins inspect mrscraper --runtime` and `openclaw plugins doctor`. Then ask your agent to search with `web_search`, fetch a URL with `web_fetch`, retrieve a page's raw HTML with `mrscraper_fetch_html`, or extract structured data with `mrscraper_scrape`.

## Tools

| Tool | Purpose |
| --- | --- |
| `mrscraper_web_search` | Search the web and return ranked results with titles, URLs, descriptions, and sources, 10 to 100 per search |
| `mrscraper_fetch_html` | Retrieve the raw HTML of a page, with its title and extracted text. Browser rendering and a screenshot are optional |
| `mrscraper_scrape` | Start an AI scraper from a URL and natural-language request |
| `mrscraper_rerun_ai_scraper` | Rerun a saved AI scraper on one URL |
| `mrscraper_bulk_rerun_ai_scraper` | Rerun a saved AI scraper on multiple URLs |
| `mrscraper_rerun_manual_scraper` | Rerun a saved manual scraper on one URL |
| `mrscraper_bulk_rerun_manual_scraper` | Rerun a saved manual scraper on multiple URLs |
| `mrscraper_get_all_results` | List stored results |
| `mrscraper_get_result_by_id` | Retrieve one stored result |

`mrscraper_fetch_html` takes `url` and the optional Scrape HTML inputs `browserRendering`, `timeout`, `warmStart`, `blockResources`, `waitForSelector`, `geoCode`, `maxAge`, `maxRetries`, and `screenshot` (`full`, `top`, or `<width>x<height>` with an optional `-<zoom>`, such as `1280x800` or `1920x1080-75`), plus `maxChars`, which limits the characters returned to the agent. `mrscraper_web_search` takes `query` and the optional `country` and `numResults` (10 to 100).

The platform tools return their API response in an untrusted-content envelope. Treat scraped text as data, not instructions. `web_search` and `mrscraper_web_search` wrap each result's title and snippet the same way. `mrscraper_fetch_html` returns HTML and extracted text in separate fields, and a requested screenshot as an image. `web_fetch` returns Markdown or plain text according to `extractMode`.

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
