# Ticket Board & /tools Checklist

Source pattern: Plinth/SansadLens's `docs/tickets/` board + `tools/internal-ops/board/`. Status
lives ONLY in each ticket's YAML frontmatter — the folder a ticket sits in is a storage _tier_, not
the source of truth. Generated indexes are rebuilt from source, never hand-edited.

## The pieces

| Path                                       | Role                                                                                                                                                   |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `docs/tickets/<id>.md`                     | ACTIVE tier — frontmatter `status: backlog \| in-progress \| done`. Filename stem must equal frontmatter `id`.                                         |
| `docs/tickets/icebox/<id>.md`              | GUARD tier — `status: icebox`. Forbidden/out-of-scope ideas, kept as a guardrail against rebuilding them.                                              |
| `docs/tickets/archive/<id>.md`             | COLD tier — `status: merged \| cancelled`. Full ticket body preserved; grows unbounded, never parsed in bulk.                                          |
| `docs/tickets/_board/board.json`           | GENERATED: `{ counts, tickets:[active only], waves }`. Merged/cancelled counts come from `archive.jsonl` line counts, not from parsing archive bodies. |
| `docs/tickets/_board/icebox.json`          | GENERATED: `{ count, tickets:[icebox] }`.                                                                                                              |
| `docs/tickets/_board/archive.jsonl`        | Append-only NDJSON, one `{id,title,phase,status,solved}` line per retired ticket. Never rewritten on a normal merge.                                   |
| `tools/internal-ops/board/cli.mjs`         | Entry point — `build \| check \| waves \| merge \| reindex`. Resolves dirs from `process.cwd()` so it must run from the repo root.                     |
| `tools/internal-ops/board/parse.mjs`       | Parses a tier directory into normalised `Ticket` objects.                                                                                              |
| `tools/internal-ops/board/frontmatter.mjs` | Raw YAML-frontmatter parse (`parseFrontmatter`).                                                                                                       |
| `tools/internal-ops/board/validate.mjs`    | The `board:check` gate — id==filename, no duplicate ids, `depends_on` resolves against active+icebox+archive with no cycle, tier↔status consistency.   |
| `tools/internal-ops/board/generate.mjs`    | Builds `board.json`/`icebox.json`/`archive.jsonl` content + the single NDJSON `archiveLine` for one ticket.                                            |
| `tools/internal-ops/board/merge.mjs`       | `planMerge(ticket)` — pure planner: computes the active→archive move + archive line, throws if status isn't terminal or `merged` lacks `solved`.       |
| `tools/internal-ops/board/waves.mjs`       | `computeWaves` — groups backlog/in-progress tickets whose deps are satisfied and whose `touches` paths don't collide, for parallel building.           |
| `package.json` `board:*` scripts           | `board:build` / `board:check` / `board:waves` / `board:merge` / `board:reindex` — thin wrappers over `node tools/internal-ops/board/cli.mjs <cmd>`.    |

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
