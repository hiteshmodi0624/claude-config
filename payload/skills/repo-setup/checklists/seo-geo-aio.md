# SEO + GEO/AIO (Search & AI-Engine Discoverability) — Setup Checklist

Source pattern: Extrack/FinanceTracker `apps/web` (Next.js App Router). One discoverability system
serving three consumers at once: classic search crawlers (meta/canonical/sitemap/robots/JSON-LD),
AI answer engines (ChatGPT, Perplexity, Claude, Google AI Overviews — via `llms.txt`, full-text
dumps, machine-readable mirrors, entity-rich structured data), and social/retargeting cards (OG
images). Everything content-bearing is driven from the copy package (`checklists/copy-based-structure.md`)
so pages, sitemap, JSON-LD, and AI dumps can never drift apart. Companion:
`checklists/landing-page-performance.md` (same surface, speed side — AI crawlers mostly don't
execute JS, so its static-HTML architecture is also a GEO prerequisite).

## The pieces

| Piece                                            | Role                                                                                                                                                                                                                        |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Root-layout `metadata`                           | `metadataBase` from a single `getSiteOrigin()` helper; title template (`%s \| Brand`); default OG (`type: website`) + Twitter `summary_large_image`; `robots.googleBot` with `max-image-preview: large`, `max-snippet: -1`; icons, `appleWebApp`, `formatDetection`. |
| Canonical-origin default at infra level          | The prod deploy config defaults `SITE_URL` to the canonical `www` host, so every consumer (sitemap, robots, JSON-LD, OG, crons) gets the right origin without per-deploy env discipline. Apex→www 301 at the CDN.                |
| Canonical discipline                             | Landing page self-canonicals; `/` is `permanentRedirect` (308) or rewrite-with-canonical to `/landing`, plus `robots: {index:false}` on `/` — kills GSC "Duplicate, Google chose different canonical". Each ad-cohort variant page self-canonicals to its own slug. |
| `robots.ts`                                      | Allow `/`; disallow `/api/`, auth callbacks, password flows, internal tooling paths; emits the sitemap URL. Every path disallowed here must ALSO be absent from the sitemap (same commit).                                     |
| `sitemap.ts` — data-driven                       | Static `INDEXABLE_PATHS` with per-path `changeFrequency` + tiered `priority` (landing = 1.0 … utility docs = 0.4). Dynamic entries fan out from copy-package slug arrays (variants, calculators, glossary, alternatives, help) — adding a slug in copy auto-extends the sitemap. Returns `[]` when `SITE_URL` unset. |
| Per-page `noindex`                               | `robots: {index:false, follow:false}` on auth callbacks, checkout, success/confirmation, claim/set-password — every page that exists for a flow, not a query.                                                                  |
| JSON-LD `@graph` component                       | ONE server-rendered `<script type="application/ld+json">` per surface, a single `@graph` cross-referenced by `@id`: `WebSite` + `Organization` (+ `sameAs` social links) + `SoftwareApplication` (with real `Offer`s) + `FAQPage`. The Organization entity is what AI engines resolve as your brand; FAQPage entries materially raise citation rate for "how does X work / is X safe" queries. |
| FAQ single-source                                | The same copy-package function feeds BOTH the visual FAQ section and the `FAQPage` JSON-LD — schema and UI cannot drift.                                                                                                        |
| Content-page JSON-LD                             | A reusable `<ToolJsonLd>`-style component emitting `WebPage`/`Article`/`HowTo`/`FAQPage`/`BreadcrumbList` per programmatic page; `Article` schema measurably improves LLM extraction.                                          |
| OG image generation                              | `opengraph-image.tsx` via `next/og` `ImageResponse` (1200×630, vector/text, system fonts, Node runtime — not edge). Wide previews ≈2× CTR on social shares and retargeting cards.                                              |
| Programmatic SEO surfaces                        | Free-tool calculators (`/tools/...` + preset slugs), `/glossary/[slug]`, `/alternatives/[slug]` (comparison queries), `/help` center (100 articles / 12 categories, native `<details>` FAQ, tiny client search island). All static, all copy-driven, all in the sitemap. |
| `public/llms.txt`                                | Spec-format curated index for AI agents: `# Brand` + `>` one-line summary; what it is, pricing, curated public URLs, short Q&A, and a "For assistants and developers" block linking `/llms-full.txt`, machine-readable mirrors, `/sitemap.xml`, MCP docs, and the JSON-LD brand entity. |
| `llms-full.txt` route                            | Route handler concatenating the ENTIRE knowledge base (help + glossary + alternatives) from the copy package into one plain-text doc — RAG agents ingest everything in a single fetch instead of crawling N pages. `dynamic = 'force-static'`, `revalidate = 86400`, long `s-maxage` + `stale-while-revalidate`. |
| Machine-readable mirrors                         | `public/pricing.md`, `public/help.md` — plain-markdown mirrors of high-value facts for AI consumption.                                                                                                                          |
| MCP connector + `/docs/mcp` page                 | Public remote MCP endpoint + a static docs page explaining it — AI agents can drive the product directly, the deepest AIO layer.                                                                                                |
| IndexNow ping in deploy pipeline                 | `scripts/indexnow-ping.mjs` + public key file in `public/`, wired into the prod deploy workflow — proactive re-crawl signal (Bing/Yandex) on every deploy instead of waiting for scheduled crawls.                              |
| `manifest.ts`                                    | PWA manifest (`MetadataRoute.Manifest`) with maskable icons + theme colors, unit-tested.                                                                                                                                        |

## Setup (new repo) — bootstrap order

- [ ] **1. Site-origin helper + infra default first.** One `getSiteOrigin()` reading one env var,
      defaulted to the canonical host in prod deploy config. Every SEO artifact consumes it; sitemap
      and robots emit nothing when it's unset (safe local/preview behavior).
- [ ] **2. Root metadata + canonical-host redirect.** Title template, `metadataBase`, default
      OG/Twitter, googleBot directives; apex→www at the CDN. Get this in before the second page
      exists.
- [ ] **3. `robots.ts` + `sitemap.ts` as code, data-driven.** Never static files — the sitemap must
      read slug arrays from the copy package so content additions auto-index. Tier priorities
      deliberately (conversion pages ≫ utility pages).
- [ ] **4. Canonical discipline for the entry page.** Decide the ONE canonical marketing URL
      (`/landing`); 308/rewrite `/` to it with `noindex` on `/`; self-canonicals on it and every
      variant. Watch GSC for duplicate-canonical noise the first weeks.
- [ ] **5. JSON-LD `@graph` on the landing surface.** WebSite + Organization + SoftwareApplication +
      FAQPage in one graph, `@id`-cross-referenced, server-rendered. FAQ items from the same copy
      function as the visual FAQ. Validate with Rich Results Test.
- [ ] **6. `noindex` sweep.** Every flow/utility page gets `robots: {index:false}` at creation time,
      and auth/internal paths land in `robots.ts` disallow + stay out of the sitemap — as one
      habit, not a cleanup.
- [ ] **7. OG image route.** `next/og` on the Node runtime; vector/text only; verify the preview in a
      real share (Slack/WhatsApp/X), not just the validator.
- [ ] **8. `llms.txt`, then mirrors, then `llms-full.txt`.** Curated index first (cheap, static);
      pricing/help markdown mirrors next; the full-text dump route once a real content corpus exists.
      Treat all three as experimental-but-cheap — growing adoption, not load-bearing.
- [ ] **9. Programmatic SEO surfaces once the core converts.** Calculators/glossary/alternatives/help
      are additive layers: copy-package content + static pages + `ToolJsonLd` + sitemap fan-out. Don't
      block launch on them.
- [ ] **10. IndexNow in the deploy pipeline.** Key file in `public/`, ping script in the prod deploy
      workflow.
- [ ] **11. Facts consistent verbatim.** Pricing, plan names, and feature claims must match exactly
      across page copy, JSON-LD offers, `llms.txt`, `pricing.md`, and third-party listings — LLMs
      cross-reference sources, and inconsistency lowers citation confidence. Single-sourcing from the
      copy package is what makes this free.

## Measurement (GEO has no PageSpeed — do this instead)

- [ ] Register Search Console + Bing Webmaster; submit the sitemap; watch coverage + duplicate-canonical
      reports.
- [ ] Periodically ask ChatGPT/Perplexity/AI Overviews your target questions ("what is X", "X vs Y",
      "is X safe") — check (a) are you cited, (b) are the facts about you current/correct. Stale facts
      propagating through AI answers is the failure mode.
- [ ] Grep CDN/server logs for AI-crawler user agents (`GPTBot`, `OAI-SearchBot`, `PerplexityBot`,
      `ClaudeBot`, `Google-Extended`, …) to confirm they actually reach the pages — WAF/bot-protection
      products block them by default under generic bot rules; `robots.txt` is advisory, the WAF is not.
- [ ] Rich Results Test after any copy change that feeds JSON-LD (single-sourcing makes drift unlikely,
      but validate anyway).

## Day-to-day

- [ ] New marketing/content page → in the same change: `metadata` with canonical, sitemap entry (or
      copy-slug addition that fans out automatically), JSON-LD if content-bearing, llms.txt link if
      high-value.
- [ ] New flow/utility page → `noindex` + robots disallow + NOT in sitemap, same commit.
- [ ] Removing/renaming a public page → robots disallow and sitemap removal together; keep a redirect
      from the old URL.
- [ ] Pricing/plan change → touch the copy package once; verify JSON-LD offers, `pricing.md`, and
      `llms.txt` picked it up (they should, by construction).
- [ ] New content corpus (docs/blog) → extend `llms-full.txt` concatenation from the same source.

## Anti-patterns

- Hand-maintained sitemap/robots files that drift from the actual route tree — generate from code +
  copy-package data.
- A JS-only client-rendered landing page — several AI crawlers execute no JS at all; if the value
  prop isn't in the server HTML, you don't exist to them.
- Duplicate canonical surfaces (`/` and `/landing` both indexable, apex and www both serving) —
  Google picks one for you, and splits equity while deciding.
- FAQ copy in the component and separately in the JSON-LD — they WILL drift; single-source them.
- Fabricated `AggregateRating`/review schema — spam-policy violation, and it torches the trust you're
  trying to build with AI engines.
- Edge runtime for OG image generation when the Node default works — extra runtime surface for zero
  gain (this repo removed it).
- Blocking AI crawlers with a default-deny robots or WAF bot rule while simultaneously investing in
  GEO content.
- Treating llms.txt as load-bearing — it's a cheap experiment with growing adoption; the durable GEO
  layers are static HTML, entity-rich JSON-LD, and fact consistency.
- Sitemap listing a path that robots.txt disallows (or vice versa) — always change both together.
