# Marketing Analytics — From-Scratch Setup Checklist

Source pattern: Extrack/FinanceTracker `packages/marketing-analytics` + a first-party `EventLog`
DynamoDB table. First-party (not third-party-tag-dependent) event capture: a client beacon writes
raw rows to one append-only table with two purpose-built GSIs, gated entirely by one capability
flag, read by both an internal ops UI and an MCP tool surface for agent-driven analysis. No
server-side domain-event writer exists in this pattern — ingestion is client-beacon-only; if you
need server-side events too, that's an intentional addition, not an oversight to copy blindly.

## The pieces

| Path                                                     | Role                                                                                                                                                                          |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DynamoDB `EventLog` table (CDK)                           | PK `session_id`, SK `sk = <client_ts_iso>#<event_id>`, TTL attribute (e.g. 90 days) so raw events age out automatically instead of growing unbounded.                        |
| GSI `gsi_event_id`                                        | PK `event_id`, SK `server_ts_iso`, `ALL` projection — cross-session lookup/dedup for one event by id.                                                                        |
| GSI `gsi_event_name`                                       | PK `event_name`, SK `server_ts_iso`, `ALL` projection — the funnel/aggregation package queries this per event name instead of a full table `Scan`. This is the GSI that makes the whole thing affordable at scale; add it before writing any aggregation query. |
| `apps/web/src/lib/<...>EventLogBeacon.ts`                 | Client-side batching beacon (`navigator.sendBeacon`/`fetch keepalive`, small batch cap, small body-size cap) — fire-and-forget, must never block or throw into the UI thread. |
| `POST /api/public/event-log`                              | Unauthenticated, CORS-restricted ingestion route. Body-size capped. Must be a no-op (not an error) if the table isn't configured yet, so it's safe to deploy before the table exists. |
| `packages/entitlements` capability (e.g. `marketingTools`) | The single gate every analytics route and every ops UI page checks — see `checklists/entitlements.md`.                                                                       |
| `packages/marketing-analytics/src/` (root export)          | Pure aggregation functions (funnels, journeys, dedup) + React panel components. No I/O — takes rows in, returns computed shapes out. Unit-testable without a live table.     |
| `packages/marketing-analytics/src/server/`                 | Route handlers (funnel/journey/sessions/duplicates/geo/…) that do the actual table queries and call into the pure aggregation functions. Exposes only a capability-check *type* — the host app injects the actual resolver, so this package doesn't hardcode which capability gates it. |
| Ops UI (`apps/ops` or equivalent internal-only app)        | Dashboards live in an internal-tooling app, not the customer-facing app — keep operator surfaces out of the product bundle entirely rather than route-gating them inside it. |
| MCP tool registrations (optional)                          | Read-only tool wrappers (one per query shape: funnel, session journey, event catalog, …) so an agent can query analytics directly — same capability gate as the HTTP routes, applied at tool-registration/dispatch time. |
| Geo enrichment (optional)                                  | IP → city/region/country via a local MaxMind-style database, run **off the hot ingestion path** (a scheduled backfill cron), not inline on every beacon write — keeps the ingestion route fast and keeps the (large) geo database out of the hot Lambda's bundle. |
| GA4 read passthrough (optional)                            | A thin REST client using a service-account JWT (no heavy SDK dependency required) so agents/dashboards can pull GA4 metrics alongside first-party data, gated by the same capability. |

## Setup (new repo) — bootstrap order

- [ ] **1. Table first.** Create the `EventLog` table with a session-scoped PK, a time-ordered SK
      (`<iso-timestamp>#<event-id>` sorts naturally within a session), and a TTL attribute from day
      one — retrofitting TTL onto an already-large table is a much bigger migration than starting
      with it.
- [ ] **2. GSIs before any aggregation code.** Add `gsi_event_id` (cross-session dedup) and
      `gsi_event_name` (per-event-name query) at table-creation time. Writing aggregation queries
      against a table `Scan` "temporarily" tends to become permanent because it works fine at low
      volume and silently gets expensive later.
- [ ] **3. Client beacon + public ingestion route.** Batch client-side (don't fire one HTTP request
      per event), cap batch size and body size, use `sendBeacon`/`keepalive` so navigation away from
      the page doesn't drop the batch. Make the route a safe no-op if the table isn't configured, so
      table provisioning and route deployment aren't a hard-ordered pair.
- [ ] **4. Capability gate before any dashboard.** Define one capability flag (via
      `checklists/entitlements.md`'s pattern) that every analytics route and every ops page checks —
      decide this before writing the first dashboard, not after, so you never have an ungated
      analytics page to retrofit.
- [ ] **5. Pure aggregation functions, separately testable from the route handlers.** Keep funnel/
      journey/dedup math as functions of `(rows) => result`, no table I/O inside them — this is what
      makes them unit-testable without a live table or network mocks, and reusable by both the HTTP
      route and any MCP tool wrapper.
- [ ] **6. First dashboard.** Ship the simplest funnel/journey view first; treat geo, GA4
      passthrough, and MCP tool registrations as strictly additive layers on top of the same
      table/GSIs — don't block the first dashboard on any of them.
- [ ] **7. Geo enrichment, if needed, off the hot path.** Run IP→location enrichment as a scheduled
      backfill job reading already-ingested rows, not inline in the ingestion route — keeps the
      ingestion Lambda small/fast and keeps a large geo-database bundle out of the highest-traffic
      function.
- [ ] **8. MCP/agent tool surface, last.** Wrap each query shape as a narrow, read-only tool, gated by
      the same capability check as the HTTP routes — don't let the tool layer bypass the gate "because
      it's just for internal agents."
- [ ] Register every new env var (table name if not CDK-auto-injected, CORS allowed origins, rate
      limit, any admin-bootstrap allowlist, GA4/geo credentials) in `.env.*.example` per this repo's
      env-var rule, in the section matching where it's consumed (Lambda runtime secret vs. CDK/build
      var).
- [ ] Add an "internal/test user" exclusion mechanism (a distinct group or flag) separate from the
      capability gate, if staff/QA traffic needs to be filterable out of dashboards — this is an
      analytics-quality concern, not an access-control concern; don't conflate the two mechanisms
      (see `checklists/entitlements.md` anti-patterns).

## Day-to-day (adding a new funnel/dashboard, debugging missing events)

- [ ] New funnel step or event type: confirm the event name is actually being beaconed (check the
      client beacon call sites, not just the analytics package) before writing any query against it —
      a query against a nonexistent event name returns an empty result, not an error, and looks like a
      bug in the aggregation code.
- [ ] New dashboard page: add it to the internal ops app under the existing gated section/shell, reuse
      the existing capability-check boundary component rather than re-implementing the gate check.
- [ ] Debugging "events aren't showing up": check the ingestion route's CORS allowlist and body-size
      cap first (silently dropped requests look identical to "no traffic" from the dashboard side),
      then check the GSI being queried actually has the event indexed (an event written before a GSI
      existed won't appear in a query against that GSI without a backfill).
- [ ] Adding an MCP tool for a new query shape: reuse the existing pure aggregation function if one
      already computes the same shape — don't write a second implementation inside the tool handler.

## Anti-patterns

- Writing aggregation queries against a table `Scan` because the GSI "can be added later" — it
  usually isn't, until the scan gets slow/expensive enough to force an urgent migration.
- Doing IP-geolocation enrichment inline on the hot ingestion path — adds latency and a large
  dependency bundle to your highest-traffic Lambda for a feature most dashboard views don't need
  in real time.
- Building a dashboard page before the capability gate exists "just for now" — it becomes the
  ungated page nobody remembers to lock down.
- Mixing pure aggregation logic into the route handler instead of a separately-testable function —
  makes both the route and any future MCP tool wrapper harder to test and guarantees duplicated
  logic once a second consumer needs the same computation.
- Treating "internal/staff user" exclusion and "capability access gate" as the same mechanism — one
  controls who can see the dashboard at all, the other controls whose traffic counts in it; conflating
  them either leaks staff traffic into product metrics or locks staff out of the tools they need to
  audit those metrics.
