# Feature request: review path for MrScraper as an official web-fetch provider

## Summary

Please consider a maintainer-reviewed route for the MrScraper plugin to become an official, trusted `web_fetch` provider. If OpenClaw accepts that integration, we would contribute a focused `/tools/mrscraper` guide and update the web-fetch overview to describe its supported behavior.

## Problem to solve

Some users need rendered content from pages that defeat plain HTTP fetching, plus structured extraction and reruns. The existing [MrScraper ClawHub skill](https://clawhub.ai/ai-mrscraper/skills/mrscraper) describes direct API use, but a skill does not register an OpenClaw `web_fetch` provider or native agent tools. A separate community plugin can register those capabilities for ordinary installations. [OpenClaw's web docs](https://docs.openclaw.ai/tools/web) say sandboxed `web_fetch` excludes third-party external providers, so publishing a plugin alone does not provide the same supported path as the official Firecrawl plugin.

## Proposed solution

1. We will publish and maintain `@mrscraper/openclaw-plugin` as a public-source ClawHub package first, with install instructions, API-token handling, tests, and a demonstrated install through the published package. The ClawHub skill remains a separate skill listing.
2. After that evidence is available, please decide whether MrScraper qualifies for an official or verified plugin path that permits sandboxed `web_fetch`. We are asking for a product and security review, not claiming that ClawHub publication itself grants official status. If that route is unsuitable, please identify a generic SDK or trust-boundary gap that would be useful to address instead.
3. Only if OpenClaw adopts the integration, we would propose a focused tool guide covering installation, provider selection, dedicated tools, data sent to MrScraper, API-key storage, and sandbox limitations, with accurate links from the web-fetch and web-tool pages. The plugin would remain maintained in its own repository unless maintainers explicitly request otherwise.

## Alternatives considered

- **Skill only:** already available on ClawHub, but it cannot register native tools or act as a `web_fetch` fallback.
- **Community plugin only:** useful for direct tools and non-sandboxed `web_fetch`; it does not unlock sandboxed provider use or imply an official docs page.
- **Bundle the plugin into core:** [PR #63668](https://github.com/openclaw/openclaw/pull/63668) attempted this and was closed with guidance to publish a third-party plugin on ClawHub. We are following that guidance.

## Impact

Affected users are those who fetch pages requiring rendering or bot protection and want to extract or rerun structured results inside OpenClaw. In sandboxed sessions, the current trust rule prevents an external MrScraper provider from serving `web_fetch`; outside a sandbox, users can install the planned plugin and select its fallback. We do not have verified adoption or failure-rate figures to claim yet; we will add package install results and user examples before requesting implementation review.

## Evidence and examples

- [Current MrScraper skill on ClawHub](https://clawhub.ai/ai-mrscraper/skills/mrscraper), published under `@ai-mrscraper` (a skill, not a native plugin package); [third-party listing](https://clawbot.ai/skills/mrscraper.html).
- [Earlier bundled-plugin PR and closure](https://github.com/openclaw/openclaw/pull/63668).
- [OpenClaw web provider rules](https://docs.openclaw.ai/tools/web), [community plugin policy](https://docs.openclaw.ai/plugins/community), and [project vision](https://github.com/openclaw/openclaw/blob/main/VISION.md).
- Public source, published package link, package-install smoke test, and user reports: to be added before filing this request.

## Do you plan to open a PR for this?

Yes, for the specific integration or documentation that maintainers agree to accept. We will not reopen the bundled-plugin PR or submit a docs-only promotional PR.
