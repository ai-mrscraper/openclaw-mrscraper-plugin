# Feature request: review path for verified community web-fetch providers

## Summary

Please define whether a community `web_fetch` provider can qualify for official verification and sandbox support. MrScraper is a concrete candidate with a published plugin. If OpenClaw accepts that integration, we would contribute a focused `/tools/mrscraper` guide and update the web-fetch overview to describe its supported behavior.

## Problem to solve

Some users need rendered content from pages that defeat plain HTTP fetching, plus structured extraction and reruns. The existing [MrScraper ClawHub skill](https://clawhub.ai/ai-mrscraper/skills/mrscraper) describes direct API use, but a skill does not register an OpenClaw `web_fetch` provider or native agent tools. A separate community plugin can register those capabilities for ordinary installations. [OpenClaw's web-fetch docs](https://docs.openclaw.ai/tools/web-fetch) say sandboxed `web_fetch` excludes third-party external providers, so publishing a plugin alone does not provide the same supported path as the official Firecrawl plugin.

## Proposed solution

1. We published and maintain [@ai-mrscraper/openclaw-mrscraper](https://clawhub.ai/ai-mrscraper/plugins/openclaw-mrscraper) as a public-source ClawHub package, with install instructions, API-token handling, tests, and an install verified through ClawHub. The [source repository](https://github.com/ai-mrscraper/openclaw-mrscraper-plugin) is public. The ClawHub skill remains a separate skill listing.
2. Please decide whether a community provider can qualify for an official or verified plugin path that permits sandboxed `web_fetch`, and what evidence and ownership that would require. MrScraper is offered for that review; ClawHub publication alone does not grant official status. If the answer is no, please identify the intended extension and documentation boundary so community plugin authors can follow it accurately.
3. Only if OpenClaw adopts the integration, we would propose a focused tool guide covering installation, provider selection, dedicated tools, data sent to MrScraper, API-key storage, and sandbox limitations, with accurate links from the web-fetch and web-tool pages. The plugin would remain maintained in its own repository unless maintainers explicitly request otherwise.

## Alternatives considered

- **Skill only:** already available on ClawHub, but it cannot register native tools or act as a `web_fetch` fallback.
- **Community plugin only:** useful for direct tools and non-sandboxed `web_fetch`; it does not unlock sandboxed provider use or imply an official docs page.
- **Bundle the plugin into core:** [PR #63668](https://github.com/openclaw/openclaw/pull/63668) attempted this and was closed with guidance to publish a third-party plugin on ClawHub. [PR #61866](https://github.com/openclaw/openclaw/pull/61866) was an earlier bundled-plugin attempt that its author closed. We are following the ClawHub guidance.
- **Bundle another skill:** [PR #70034](https://github.com/openclaw/openclaw/pull/70034) was closed because a MrScraper CLI helper skill belongs in ClawHub under the current core contribution policy. The existing ClawHub skill remains separate from this plugin.

## Impact

Affected users are those who fetch pages requiring rendering or bot protection and want to extract or rerun structured results inside OpenClaw. The current trust rule blocks an external MrScraper provider on every sandboxed `web_fetch` call; outside a sandbox, users can install the plugin and select its fallback. This blocks a uniform web-fetch workflow for those users and requires a separate API path or an unsandboxed configuration. We do not have verified plugin adoption or failure-rate figures to claim yet. This request asks for product criteria; any implementation proposal would need real usage evidence.

## Evidence and examples

- [Current MrScraper skill on ClawHub](https://clawhub.ai/ai-mrscraper/skills/mrscraper), published under `@ai-mrscraper` (a skill, not a native plugin package); [third-party listing](https://clawbot.ai/skills/mrscraper.html).
- [Published MrScraper code plugin](https://clawhub.ai/ai-mrscraper/plugins/openclaw-mrscraper), version 0.1.0, with a clean ClawHub security scan. It remains a community package, not an official OpenClaw plugin.
- [Earlier bundled-plugin PR and closure](https://github.com/openclaw/openclaw/pull/63668), [author-closed prior plugin PR](https://github.com/openclaw/openclaw/pull/61866), and [declined bundled skill PR](https://github.com/openclaw/openclaw/pull/70034).
- [OpenClaw web provider rules](https://docs.openclaw.ai/tools/web-fetch), [community plugin policy](https://docs.openclaw.ai/plugins/community), and [project vision](https://github.com/openclaw/openclaw/blob/main/VISION.md).
- [Public plugin source](https://github.com/ai-mrscraper/openclaw-mrscraper-plugin): 21 tests pass in [CI](https://github.com/ai-mrscraper/openclaw-mrscraper-plugin/actions/runs/37743216570), and ClawHub's isolated runtime validator reports zero findings against OpenClaw 2026.9.8. Prior review findings have been addressed: the unblocker API token uses a header, Markdown mode returns Markdown, the unused timeout override parameters are gone, and the platform API host allowlist excludes the unrelated sync API host.
- An isolated OpenClaw 2026.9.8 installation using `openclaw plugins install clawhub:@ai-mrscraper/openclaw-mrscraper --accept-capabilities` loaded all eight tools and the `web_fetch` provider; `openclaw plugins doctor` passed. This did not call the live MrScraper API.

## Additional information

The provider sends target URLs and extraction instructions to MrScraper's hosted API and consumes account quota. The code and package are maintained by `@ai-mrscraper`, not OpenClaw. We can open a focused PR for the integration or documentation that maintainers agree to accept. We will not reopen the bundled-plugin PR or submit a docs-only promotional PR.
