# Landing-Page Performance (Core Web Vitals / PageSpeed) — Setup Checklist

Source pattern: Extrack/FinanceTracker `apps/web` (Next.js App Router → OpenNext → CloudFront/Lambda).
The landing page is a paid-traffic entry point — LCP regressions directly drop CAC efficiency. This
checklist is the architecture that took that page from **LCP ~8.7s mobile / `NO_LCP` in Lighthouse /
perf 47** to **main-thread 6.9s→2.0s, TBT 3000ms→~570ms, LCP 5.0s lab (far lower on real devices),
a11y 100** — through architecture (provider isolation, server/client splitting, script tiering),
not micro-tweaks. Companion: `checklists/seo-geo-aio.md` (same surface, discoverability side).

## The pieces

| Piece                                                      | Role                                                                                                                                                                                                                     |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Route groups: `(app)`, `(auth)`, marketing at root         | Authed app lives under `(app)` whose layout wraps auth/query/dialog providers + app chrome. Marketing routes (`/landing`, `/tools`, `/help`, legal, …) sit at the app-router ROOT, outside every provider group, so they never bundle the auth SDK, app chrome, or a preferences round-trip. |
| Minimal marketing layout                                   | Landing layout keeps ONLY the providers it truly needs (e.g. a query provider because a `?coupon=` param triggers `useQuery`). Everything else stays out. Shared components used on both surfaces return safe anonymous fallbacks from `useAuth()`-style hooks instead of throwing, so they render provider-less. |
| Middleware `/` rewrite                                     | Anonymous `/` is **rewritten** (not redirected) to `/landing` — marketing HTML in the same response, zero extra round-trip, URL stays `/`. Auth-presence cookie sends signed-in users to the app. The `/` response is forced `no-store` so a cookie-blind CDN cache key never serves anon HTML to an authed user; `/landing` itself stays edge-cached. |
| Fully static marketing pages                               | `export const dynamic = 'force-static'; export const revalidate = false` → prerendered HTML served from the CDN edge, ~0 TTFB, no per-request Lambda. Variant pages: `generateStaticParams` + `dynamicParams = false` (one prerendered file per ad-cohort slug). Query-param personalization resolves client-side after mount so it never breaks static generation. |
| Server-slot composition                                    | Hook-free page sections render as **server components** and are injected into the `'use client'` shell as `ReactNode` slots — their markup never enters the hydration bundle. The client shell owns only interactive bits (header, drawer, carousel, pricing toggle). Tiny client islands (`RevealOnScroll`, scroll-CTA button) sit inside otherwise-server sections. |
| Below-fold code-splitting                                  | Heavy below-fold sections (pricing grid, comparison table) load via `next/dynamic(..., { ssr: true })` — markup stays in the server response for SEO/social crawlers; only the JS chunk is deferred off the hero's critical path.                                     |
| No web fonts                                               | System font stack, zero font network cost — a deliberate LCP choice. If one page genuinely needs a display font, scope `next/font` to THAT page's layout only, never the root layout.                                                                                  |
| Plain `<img>` + CSS mockups                                | Tiny static SVG logos ship as plain `<img>` (`fetchPriority="high"` above-fold, `loading="lazy"` below) — the image-optimizer round-trip is pure overhead for a 542-byte SVG. Product "screenshots" are pure CSS/DOM device frames: zero raster bytes, crisp at every DPR. |
| Deferred scroll-snap carousel                              | Any `scroll-snap-type: mandatory` container starts WITHOUT snap classes; a `snapReady` state enables them on first `pointerdown`/`touchstart`/`wheel`/`keydown` (once/passive listeners). See Measurement §NO_LCP for why.                                              |
| Tiered third-party scripts                                 | Per-vendor loading strategy, not one-size-fits-all — see the matrix below.                                                                                                                                                                                              |
| Env-gated preconnects                                      | `<link rel="preconnect">` for each analytics/ad origin, each emitted only when that vendor's env key is set (no unused sockets). Worth 100–300ms on first paint for mobile ad-clickers. Include BOTH hosts of a vendor when bundle host ≠ ingest host.                     |
| First-party beacons                                        | Batched event beacon: plain `fetch` (no keepalive) on idle flushes; `navigator.sendBeacon` (keepalive-fetch fallback) only on terminal `pagehide`/`visibilitychange→hidden`. A beacon that MUST survive navigation on every flush (server conversions API) may use `keepalive: true` throughout — but then cap batch size small (e.g. 8 events, <2 KB) because the per-page 64 KB keepalive budget is shared. Shared `event_id` across client pixel + server conversions API for exact dedup. |
| `WebVitalsReporter`                                        | `useReportWebVitals` → forwards LCP/CLS/INP/FCP/TTFB as a `web_vital` event to your own analytics — field data segmentable by UTM/campaign, which generic CrUX can't give you.                                                                                            |
| CDN immutable-asset policy                                 | Response-headers policy sending `Cache-Control: public, max-age=31536000, immutable` on content-hashed `_next/*` assets ONLY; in-place public files (favicon, `sw.js`, release notes) excluded so they stay revalidatable. Fixed ~740 KiB of re-downloaded JS/CSS per repeat visit. Enable HTTP/2+3 at the CDN. |
| Apex→www redirect stack                                    | Infra-level 301 from apex to the canonical `www` host preserving path+query — one canonical origin, no duplicate-content split, no client-side redirect hop for paid clicks.                                                                                              |
| Bundle-hygiene config                                      | Internal workspace packages in `transpilePackages` + `experimental.optimizePackageImports` for the copy/content package, so a CJS barrel doesn't ship its whole compiled output (35–60 KB gz dead weight/route) to every page.                                             |

### Third-party script tiering matrix (as proven out)

| Vendor                  | Strategy                                                                                                         | Why                                                                                                    |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| GA4                     | `lazyOnload`                                                                                                      | Measurement, not paid-conversion signal — keeps ~50 KB out of the hydration window.                     |
| GTM (+ Clarity etc.)    | Per-route policy: `off` on ultra-light pages, `lazyOnload` on marketing/SEO prefixes, `afterInteractive` in-app | Session-replay tags must never block marketing paint; app routes can afford default timing.             |
| Ad pixel (Meta)         | `afterInteractive`, **route-scoped** — component returns `null` off marketing/pre-auth routes                    | ~17 KB gz + ~15 ms parse per navigation has no business on authed app routes; post-login conversions go server-side (CAPI). |
| Server conversions API  | Effect beacon with shared `event_id`; only fires client-side when the pixel is blocked/unconfigured              | ~30% of EU/mobile traffic blocks the pixel; server side covers it without double-counting.               |
| Product analytics       | Lazy at idle via an enqueue wrapper, module singleton (no provider remount), replay off if another tool owns it   | Never in the initial bundle.                                                                            |
| First-party tag         | `afterInteractive`, mounted AFTER the vendors whose session ids it stamps                                          | Ordering is load-bearing when one tag cross-links others' ids.                                          |

Every `useSearchParams()`-reading analytics component gets its own `<Suspense fallback={null}>`
boundary (the hook suspends during static generation) — separate boundaries so one suspended hook
must not block the others. Plain `usePathname()` readers don't need one.

## Setup (new repo) — bootstrap order

- [ ] **1. Route-group split before the first marketing page.** Create `(app)`/`(auth)` groups and put
      ALL providers + app chrome in the `(app)` layout. Marketing routes go at root with a minimal
      layout. Retrofitting this later means auditing every shared component for provider assumptions.
- [ ] **2. Shared components get anonymous fallbacks.** Any component both surfaces use must not throw
      when its provider is absent — return a safe anonymous default from the hook.
- [ ] **3. Static rendering directives on every marketing page.** `force-static` + `revalidate = false`
      (or an explicit revalidate for content that ages). Verify at build time: the route must show as
      prerendered in build output, not dynamic.
- [ ] **4. `/` handling.** Middleware rewrite (not redirect) of anonymous `/` to the landing route,
      `no-store` on the `/` response, auth-presence cookie routing signed-in users into the app.
- [ ] **5. Server-slot composition from day one.** Page = server component rendering JSON-LD + static
      section slots + a small client shell. New sections default to server; a section becomes a client
      island only when it needs an event handler.
- [ ] **6. Fonts decision.** Default: system stack, no web fonts. Exception requires page-scoped
      `next/font` in that page's own layout.
- [ ] **7. Script tiering + preconnects.** Wire the matrix above; env-gate every preconnect; separate
      Suspense boundary per `usePathname` consumer.
- [ ] **8. CDN caching + canonical host.** Immutable policy on hashed assets only, HTTP/2+3, apex→www
      (or www→apex) infra redirect.
- [ ] **9. WebVitalsReporter → own analytics.** Field CWV by UTM from launch day, so you're never
      arguing from lab-only data.
- [ ] **10. Bundle-membership assertion.** After first build, grep the build manifest
      (`.next/app-build-manifest.json`) and assert no marketing route's chunk list contains a heavy
      app-only dependency (charts lib, auth SDK). Cheap to script; catches barrel leaks structurally.

## Measurement methodology (hard-won — follow exactly)

- [ ] **Prod build or prod URL ONLY.** `next dev`/Turbopack numbers are meaningless (unminified,
      unbundled, no reliable LCP emission). Local: `next build && next start` on a non-default port so
      it doesn't collide with the dev server.
- [ ] **Perf score/CWV via Lighthouse CLI** (`npx lighthouse --only-categories=performance`, mobile
      form factor, headless). Note: some MCP/devtools `lighthouse_audit` wrappers EXCLUDE the
      performance category (a11y/SEO/best-practices only) — check before trusting a "no perf data" run.
- [ ] **Run each page twice, take the better run** — lab variance is real.
- [ ] **Contended-laptop caveat.** Mobile Lighthouse applies 4× CPU throttle; on a busy machine
      LCP/TBT come out 3–5× worse than prod. From such runs trust ONLY: CLS, whether LCP recorded at
      all (`NO_LCP` vs a number), opportunity **bytes** (machine-independent), and bundle membership.
      Certify absolute budgets on the live prod URL post-deploy.
- [ ] **Lab vs field.** Google ranks on CrUX field data (28-day rolling), not your lab score. Register
      Search Console; watch the CWV report; segment your own `web_vital` events by UTM. A lab LCP of
      5.0s under 4× throttle can be a fine real-device experience — don't panic, and don't declare
      victory, on lab alone.
- [ ] **Budgets:** perf ≥ 90 (HIGH below), LCP ≤ 2.5s (HIGH; **`NO_LCP` = BLOCKER**), CLS ≤ 0.1,
      TBT ≤ 200ms (MEDIUM), route JS "no large jump vs main". Findings must cite the specific
      Lighthouse audit + byte/ms number — never a vague "page is slow".

### The `NO_LCP` trap (worth its own section)

**Symptom:** page visibly renders but Lighthouse reports `LanternError: NO_LCP`; LCP/TBT/TTI all
unscorable. **Root cause class:** *any scroll during load halts Chrome's LCP-candidate recording.*
A `scroll-snap-type: mandatory` container whose resting position isn't a snap point (e.g. leading
padding) force-scrolls itself during hydration — often an INNER scroller, so `window.scrollY` stays 0.

- **Diagnose:** trace shows `PaintTimingDetector::NotifyScroll` and only
  `LargestContentfulPaint::Invalidate` (no `::Candidate`). Capture the scroll event's `target` to find
  the scroller.
- **Fix that works:** don't apply snap classes until first real user interaction
  (`pointerdown`/`touchstart`/`wheel`/`keydown`, once+passive). Interaction can only happen after LCP.
- **Fixes that DON'T work (tested, rejected):** deferring snap to the `load` event (racy — on a
  JS-heavy page `load` fires before FCP and the snap-scroll still kills LCP);
  `scroll-snap-type: proximity` (browser still snaps on load); removing hero entrance animation
  (fine hygiene — transform-only, `prefers-reduced-motion` gate — but it was never the cause).

## Day-to-day

- [ ] New marketing section → server component slot by default; justify any `'use client'`.
- [ ] New third-party tag → place it in the tiering matrix BEFORE adding it; re-run Lighthouse on the
      landing page after; add its env-gated preconnect; check it didn't double-fire an existing
      vendor's page-view.
- [ ] New workspace package consumed by marketing pages → add to `transpilePackages`; if it's a
      content/copy barrel, add to `optimizePackageImports`; re-check bundle membership.
- [ ] Importing anything from an internal package on a marketing page → import the subpath
      (`@repo/x/queryKeys`), never the barrel — a barrel that re-exports one charts panel ships the
      whole charts lib to the landing page (TBT 3000ms→890ms was ONE such leak).
- [ ] Audit each marketing route independently — a page with no carousel/mockups may already be fine;
      cross-cutting fixes (barrel leaks, a11y) still apply everywhere.

## Anti-patterns

- Measuring on `next dev`, or trusting absolute LCP/TBT from a contended laptop — both produce
  numbers you'll waste days "fixing".
- One root layout that wraps every route in auth/query/chrome providers "for simplicity" — the whole
  app chrome hydrates before the hero paints (that's the LCP ~8.7s starting point).
- `next/image` for tiny static SVGs — optimizer round-trip costs more than the asset.
- Raster screenshots for product previews when CSS/DOM mockups render sharper for zero bytes.
- Applying `snap-mandatory` at render time because "it's just CSS" — see the `NO_LCP` trap.
- `keepalive: true` on every analytics flush with unbounded batch sizes — the 64 KB keepalive
  budget is per-page and shared; either reserve keepalive for terminal flushes or cap batches
  small enough that every flush fits.
- Barrel imports from internal packages on marketing routes ("it's just a query key").
- Blanket `afterInteractive` for every third-party script — tier them; session-replay and
  measurement tags belong at `lazyOnload` or off entirely on marketing routes.
- Marking in-place public files (`sw.js`, favicon) immutable along with hashed assets — they can
  never be updated again without renaming.

## Known gaps in the source repo (close them in a new repo)

- No security headers (HSTS/CSP/X-Frame-Options/Referrer-Policy) at CDN or app layer.
- No CI Lighthouse/CWV budget — budgets live only in a review skill, enforced by process not pipeline.
- (Resolved there, but audit for it here:) GA4 double-loading via both a standalone tag AND a
  GTM-fired GA4 config tag — the source repo hit this (~474 KiB duplicate gtag) and fixed it by
  pausing the GTM-side GA4 config tag; verify exactly one `gtag/js` + one `page_view` fires.
