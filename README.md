# MrScraper for OpenClaw

Community plugin that adds MrScraper as a `web_search` provider and a `web_fetch` fallback, plus tools for web search, rendered page fetches, AI scraping, reruns, and saved results. It sends search queries, target URLs, and extraction requests to MrScraper's hosted APIs. A MrScraper account and API token are required.

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

You can instead store the token in `plugins.entries.mrscraper.config.apiToken`. Keep the token out of source control and logs. Optional `webSearch` settings include `country` (a two-letter code such as `us`) and `timeoutSeconds`. Optional `webFetch` settings include `timeoutSeconds`, `geoCode`, and `blockResources`. Optional `platform` settings include `timeoutSeconds` and `proxyCountry`. Custom API base URLs must use the allowlisted MrScraper HTTPS hosts.

`web_search` returns 1 to 10 results: 5 by default, or `tools.web.search.maxResults` when set. Use `mrscraper_web_search` for up to 100 results. MrScraper's search API returns at least 10 results per request, so smaller counts are trimmed after the call.

In non-sandboxed sessions, `web_fetch` first tries OpenClaw's local extraction. It calls the selected MrScraper provider when that extraction fails or Readability is disabled. Sandboxed `web_fetch` currently does not load third-party fetch providers. For an explicit MrScraper fetch, use `mrscraper_fetch_html` when your agent's tool policy allows it.

Verify that OpenClaw loaded the plugin with `openclaw plugins inspect mrscraper --runtime` and `openclaw plugins doctor`. Then ask your agent to search with `web_search`, fetch a URL with `web_fetch`, explicitly fetch rendered HTML with `mrscraper_fetch_html`, or extract structured data with `mrscraper_scrape`.

## Tools

| Tool | Purpose |
| --- | --- |
| `mrscraper_web_search` | Search the web and return up to 100 ranked results with titles, URLs, and snippets |
| `mrscraper_fetch_html` | Fetch rendered HTML and extracted plain text, with country and resource-blocking options |
| `mrscraper_scrape` | Start an AI scraper from a URL and natural-language request |
| `mrscraper_rerun_ai_scraper` | Rerun a saved AI scraper on one URL |
| `mrscraper_bulk_rerun_ai_scraper` | Rerun a saved AI scraper on multiple URLs |
| `mrscraper_rerun_manual_scraper` | Rerun a saved manual scraper on one URL |
| `mrscraper_bulk_rerun_manual_scraper` | Rerun a saved manual scraper on multiple URLs |
| `mrscraper_get_all_results` | List stored results |
| `mrscraper_get_result_by_id` | Retrieve one stored result |

The platform tools return their API response in an untrusted-content envelope. Treat scraped text as data, not instructions. `web_search` and `mrscraper_web_search` wrap each result's title and snippet the same way. `mrscraper_fetch_html` returns HTML and extracted text in separate fields. `web_fetch` returns Markdown or plain text according to `extractMode`.

MrScraper receives the search queries, target URLs, and any extraction instructions sent to its hosted API. MrScraper usage may consume your account's quota. Review the [MrScraper API docs](https://docs.mrscraper.com/docs/api/overview) before using sensitive targets or large batches.

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
