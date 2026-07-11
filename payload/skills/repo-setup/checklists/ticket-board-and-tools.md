# Ticket Board & /tools Checklist

Source pattern: Plinth/SansadLens's `docs/tickets/` board + `tools/internal-ops/board/`. Status
lives ONLY in each ticket's YAML frontmatter — the folder a ticket sits in is a storage _tier_, not
the source of truth. Generated indexes are rebuilt from source, never hand-edited.

## The pieces

| Path                                           | Role                                                                                                                                                                                                      |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docs/tickets/<id>.md`                         | ACTIVE tier — frontmatter `status: backlog \| in-progress \| done`. Filename stem must equal frontmatter `id`.                                                                                            |
| `docs/tickets/icebox/<id>.md`                  | GUARD tier — `status: icebox`. Forbidden/out-of-scope ideas, kept as a guardrail against rebuilding them.                                                                                                 |
| `docs/tickets/archive/<id>.md`                 | COLD tier — `status: merged \| cancelled`. Full ticket body preserved; grows unbounded, never parsed in bulk.                                                                                             |
| `docs/tickets/inbox/feature-asks/<slug>.md`    | INTAKE — the user's own words, a feature request captured verbatim. `id: ask-<slug>`, `kind: ask`. NOT an active ticket; the active parser skips `inbox/`.                                                |
| `docs/tickets/inbox/reported-issues/<slug>.md` | INTAKE — a reported symptom captured verbatim. `id: issue-<slug>`, `kind: issue`. Links to the tickets that fix it; stays open until the owner verifies live.                                             |
| `docs/tickets/_board/board.json`               | GENERATED: `{ counts, tickets:[active only], waves }`. Merged/cancelled counts come from `archive.jsonl` line counts, not from parsing archive bodies.                                                    |
| `docs/tickets/_board/icebox.json`              | GENERATED: `{ count, tickets:[icebox] }`.                                                                                                                                                                 |
| `docs/tickets/_board/archive.jsonl`            | Append-only NDJSON, one `{id,title,phase,status,solved}` line per retired ticket. Never rewritten on a normal merge.                                                                                      |
| `tools/internal-ops/board/cli.mjs`             | Entry point — `build \| check \| waves \| merge \| verify \| reindex`. Resolves dirs from `process.cwd()` so it must run from the repo root.                                                              |
| `tools/internal-ops/board/parse.mjs`           | Parses a tier directory into normalised `Ticket` objects.                                                                                                                                                 |
| `tools/internal-ops/board/frontmatter.mjs`     | Raw YAML-frontmatter parse (`parseFrontmatter`).                                                                                                                                                          |
| `tools/internal-ops/board/validate.mjs`        | The `board:check` gate — `validateBoard` (id==filename, no dup ids, `depends_on` resolves against active+icebox+archive with no cycle, tier↔status) + `validateInbox` (intake rules + owner-verify gate). |
| `tools/internal-ops/board/intake.mjs`          | Parses the inbox tier (`parseInboxDir`, `normaliseInboxItem`) + the `INBOX_KINDS` per-folder spec (id prefix, status enum, owner/date field names). Pure; fs injected.                                    |
| `tools/internal-ops/board/verify.mjs`          | `planVerify(item, today)` — pure planner for `board:verify`: computes the owner-verify frontmatter updates + `applyFrontmatterUpdates` string transform. Clock injected; the CLI does the fs write.       |
| `tools/internal-ops/board/generate.mjs`        | Builds `board.json`/`icebox.json`/`archive.jsonl` content + the single NDJSON `archiveLine` for one ticket.                                                                                               |
| `tools/internal-ops/board/merge.mjs`           | `planMerge(ticket)` — pure planner: computes the active→archive move + archive line, throws if status isn't terminal or `merged` lacks `solved`.                                                          |
| `tools/internal-ops/board/waves.mjs`           | `computeWaves` — groups backlog/in-progress tickets whose deps are satisfied and whose `touches` paths don't collide, for parallel building.                                                              |
| `package.json` `board:*` scripts               | `board:build` / `board:check` / `board:waves` / `board:merge` / `board:verify` / `board:reindex` — thin wrappers over `node tools/internal-ops/board/cli.mjs <cmd>`.                                      |

Ticket frontmatter shape:

```yaml
---
id: db-schema-knowledge-graph # MUST equal filename stem
title: DB Schema — Political Knowledge Graph
status: backlog # backlog | in-progress | done | merged | cancelled | icebox
phase: 1 # 1 | 2 | 3 | null
priority: P1 # P1 | P2 | P3 | null
estimate: L # XS | S | M | L | XL | null
depends_on: [package-db-prisma] # ticket ids; [] if none
touches: [packages/db] # paths this ticket modifies (drives wave conflict split)
solved: null # string, REQUIRED when status === merged
---
```

## Intake tier (inbox/) — the user's captured words

The intake layer keeps **the user's own words** as a first-class artifact, kept _separate_ from the
engineering tickets they spawn. An intake item **links to** one or more tickets and stays **open
until the owner verifies the fix live** — merging the tickets is not enough on its own. Two streams:

| Path                                           | id / kind                      | Owner-verify fields flipped by `board:verify`   |
| ---------------------------------------------- | ------------------------------ | ----------------------------------------------- |
| `docs/tickets/inbox/feature-asks/<slug>.md`    | `ask-<slug>` / `kind: ask`     | `owner_accepted: true` + `accepted_on: <today>` |
| `docs/tickets/inbox/reported-issues/<slug>.md` | `issue-<slug>` / `kind: issue` | `owner_verified: true` + `verified_on: <today>` |

Reported-issue frontmatter (feature-ask mirrors it with `asked_on`/`status: captured…`/`owner_accepted`):

```yaml
---
id: issue-<slug> # MUST equal filename stem; MUST NOT collide with a ticket id
title: <string>
kind: issue
reported_on: <YYYY-MM-DD>
repro_url: <string|null>
tickets: [<ticket-id>, ...] # tickets that fix this; [] while triaging
status: open # open | tickets-filed | fix-merged | verified | wont-fix
owner_verified: false # boolean — flipped only by `yarn board:verify`
verified_on: null # YYYY-MM-DD once owner_verified, else null
---
```

**Owner-verify gate.** `yarn board:verify <id>` records the owner's live confirmation (sets the two
fields above with today's date). It refuses (non-zero exit) if the id doesn't resolve to an inbox
item or is already verified/accepted. The clock is injected at the CLI boundary — `verify.mjs`
itself never calls `new Date()`.

**`board:check` enforcement.** The gate **fails** when a reported-issue's linked tickets are ALL
retired as `merged` but `owner_verified` is not yet `true` (message: run `yarn board:verify <id>`) —
so a "fix" can't be silently closed on merge without the owner confirming it live. It also validates
every inbox item: `id` == filename stem, `kind` matches its folder, `status` in the folder's enum,
the owner flag is a boolean, every linked ticket id resolves (active + icebox + archive), and no
inbox id collides with a ticket id. The active-tier parser ignores `inbox/` exactly as it ignores
`archive/`/`icebox/`/`_board/` — intake items are never counted as active tickets.

## Setup (new repo)

- [ ] Three tiers exist as plain directories: `docs/tickets/`, `docs/tickets/icebox/`,
      `docs/tickets/archive/` — plus a generated `docs/tickets/_board/` (never committed by hand,
      only by the build/merge commands).
- [ ] The board engine lives outside `packages/`/`apps/` — a non-shippable `tools/<name>/board/`
      home, since it's engineering-internal tooling, not product code, and shouldn't be bound by
      the app's own layer/import rules.
- [ ] `cli.mjs` resolves `TICKETS_DIR` etc. from `process.cwd()`, and every `board:*` script in
      `package.json` is a one-line wrapper calling it — never call the `.mjs` files directly, and
      never hand-edit `board.json`/`icebox.json`.
- [ ] `validate.mjs`'s checks run in **both** `build` and `check` — a build never writes a stale or
      invalid index.
- [ ] `merge.mjs`'s `planMerge` is a pure function (no fs) unit-tested on its own — the fs
      move/append happens only in `cli.mjs`'s `cmdMerge`, which then calls `cmdBuild()` at the end so
      `board.json` never drifts after a merge.
- [ ] A PostToolUse-style hook (or equivalent CI step) regenerates `board.json`/`icebox.json` on
      every ticket-file edit, so they can never silently go stale between commits.
- [ ] The intake tier (`inbox/feature-asks/`, `inbox/reported-issues/`) exists as plain folders, and
      `intake.mjs`/`verify.mjs` are pure (fs + clock injected) with their own co-located tests. Wire
      `validateInbox` into `board:check` and add a `board:verify` script — so a reported "fix" can't
      close on merge alone; the owner must confirm it live.

## Day-to-day (retiring a ticket, adding one, auditing)

- [ ] To retire: set the ticket's own frontmatter `status: merged` (with `solved` filled) or
      `cancelled` FIRST, then run `yarn board:merge <id>` — it refuses a non-terminal status, a
      `merged` ticket with no `solved`, or a ticket already in `archive/`. Never `git mv` a ticket
      file by hand; that skips the `archive.jsonl` append and rebuild.
- [ ] To add: create `docs/tickets/<id>.md` where `<id>` matches the filename stem exactly, then run
      `yarn board:build` (or `board:check`) to confirm it's valid before relying on `board.json`.
- [ ] To audit dependency ordering / find parallelizable work: `yarn board:waves` — trust its groups
      over eyeballing `depends_on` by hand, since it also checks `touches`-path collisions.
- [ ] To audit full history consistency (not just the hot set): `yarn board:check --full` —
      reconciles every `archive/*.md` against `archive.jsonl`; `yarn board:reindex` repairs drift.
- [ ] Never parse `archive/*.md` in bulk in application code — `archive.jsonl` is the cheap index;
      full ticket bodies are for humans opening one file at a time.
- [ ] When the user reports a bug or asks for a feature, capture their words verbatim as an intake
      item under `inbox/` FIRST, then file the engineering ticket(s) and link them in `tickets: [...]`.
      Once the fix is merged AND the user confirms it live, close the loop with `yarn board:verify <id>`
      — not before. `board:check` will nag if all linked tickets merged but the owner hasn't verified.

## `/tools` folder (non-shippable internal tooling)

- [ ] A repo-root `tools/<namespace>/` directory holds engineering-internal scripts that are not
      part of the shipped product: the ticket-board engine above, internal ops web servers/dashboards,
      one-off data/graph utilities, coverage or reporting scripts.
- [ ] Nothing under `tools/` is imported by `packages/` or `apps/` at runtime — it's invoked via
      `package.json` scripts (`yarn board:*`, etc.), not wired into the product's dependency graph.
- [ ] Each subtool is co-located with its own tests (e.g. `tools/<ns>/board/*.test.mjs`, run via a
      dedicated `*:test` script) — the same test-first bar applies even though the code never ships.
- [ ] `.DS_Store` and other OS cruft aside, `tools/` stays flat-per-concern (`board/`, `web/`,
      `graph/`, `coverage-report/`, …) — one directory per internal capability, not a junk drawer.

## Anti-patterns

- Treating a ticket's folder location as its status — always read frontmatter `status`; a ticket
  can be momentarily miscategorized by folder without `board:check` catching it if that check is
  skipped.
- Hand-writing or hand-editing `board.json`/`icebox.json`/`archive.jsonl` — any manual edit is
  invisible to `board:check`'s staleness comparison and will just get overwritten (or flagged stale)
  on the next `board:build`.
- Retiring a ticket by moving the file yourself — bypasses the `archive.jsonl` append, so
  `board:check --full` will flag the archived file as having "no line in archive.jsonl".
- Parsing every `archive/*.md` body on a routine build/check — defeats the entire point of the
  tiered design (`build`/`check` are supposed to stay O(active), independent of history size).
- Putting internal-only tooling inside `packages/` or `apps/` where it inherits the product's
  layer-import rules and gets mistaken for shippable code.
- Treating a reported-issue as closed the moment its tickets merge — the intake item stays open until
  the owner verifies the fix live (`board:verify`); "the code shipped" is not "the user confirmed it".
- Collapsing intake into the ticket itself — the user's raw words are a separate artifact from the
  engineering ticket, so the original report survives even after the ticket is retired to `archive/`.
