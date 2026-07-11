---
name: backlog-verify-loop
description: Use when you want an autonomous loop that drives a backlog to completion AND browser-verifies the result end-to-end, minting new tickets from real failures until the site is clean. Triggers - "loop until the site works", "verify every page and link", "integration-test the whole app in a loop", "keep draining and re-checking", "playwright verify then fix then repeat".
---

# backlog-verify-loop

## Overview

The outer loop that wraps planning + implementation + browser verification and REPEATS until done.
**Core principle: the browser pass is a discovery engine that mints bug tickets, not a red/green
gate.** Its one hard job is to **separate a code bug from a missing-data empty state** — conflate them
and the loop never terminates (it churns forever on data gaps it can't fix by coding).

Composes [[backlog-detail]] (Phase 1) → [[backlog-drain]] (Phase 2) → browser verify (Phase 3) → repeat.

## When to use

- You want hands-off "drain the backlog, then prove the app actually works, then fix what's broken,
  repeat" — a self-closing loop, not a one-shot.
- The app has crawlable routes (public pages, links, data states) worth asserting.

**Do NOT use** for a single ticket, a backend with no UI to crawl, or when you want to approve each
round manually (run the phases by hand instead).

## The loop (each ROUND)

1. **Build + serve locally.** `yarn build`, start the app, wait for ready. **Test the LOCAL merged
   build**, not prod — isolates code bugs from infra/deploy/data noise. (Prod-only issues → separate tickets.)
2. **Crawl (Playwright / browser MCP).** Visit every route _type_ (home + each dynamic template:
   profile, detail, item, topic, search, source) and follow **every in-page link**. Per page assert:
   HTTP 200 / no crash / no hydration error, the shell renders, every `<a>` href resolves (no dangling
   internal 404, client-side nav not a full reload where SPA is expected).
3. **CLASSIFY every finding — the whole point:**

   | Finding                                                                            | Verdict                                                                         |
   | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
   | 500 / crash / hydration error / broken internal link / unexpected full-page reload | **CODE BUG** → file a ticket (proper frontmatter, `board:check`)                |
   | Page 200 but empty because no data is ingested yet                                 | **NOT a failure** → log as a data-coverage note; do NOT file, do NOT loop on it |
   | Slow / cosmetic                                                                    | nit → optional ticket, never a loop blocker                                     |

4. **Terminate?** If this round filed **zero code-bug tickets** AND the backlog (`backlog` +
   `in-progress`) is **empty** → STOP and print the final report. Otherwise continue.
5. **Repair.** Run [[backlog-detail]] in **autonomous mode** (no human in the loop → skip its Drill
   stage; the writer picks safe defaults and records `ASSUMPTION:` per ticket) on the new + remaining
   tickets, then [[backlog-drain]] to merge them green. Then loop back to step 1.

**Round report each time:** routes crawled · code bugs found+filed · data-gaps noted · tickets merged · gate result.

## Running it detached

Wrap the loop with the `/loop` skill (dynamic / self-paced) so it survives across turns and you can
walk away — it re-fires each round on its own. Without that it still loops inside one session; keep the
tab open. Set the orchestrator session to **Opus / high** — it owns merge, gate, and the code-vs-data call.

## Model / effort

| Role                                   | Model           | Why                                                    |
| -------------------------------------- | --------------- | ------------------------------------------------------ |
| Orchestrator (this session)            | **opus / high** | merge, gate, code-vs-data judgement                    |
| Playwright crawler                     | sonnet          | mechanical navigation + assertions                     |
| Code-vs-data classifier (if ambiguous) | opus            | deciding "bug vs no-data yet" is the failure-mode risk |

## Common mistakes

| Mistake                           | Reality                                                                      |
| --------------------------------- | ---------------------------------------------------------------------------- |
| Treat empty-data page as a bug    | Loop never terminates — it can't code its way out of a dead data source      |
| Crawl prod instead of local build | Conflates code bugs with deploy lag + data emptiness; slower feedback        |
| Skip the classify step            | Every finding becomes a "fix me" ticket → infinite churn                     |
| No termination predicate          | "Until clean" needs a concrete check: zero new bug-tickets AND empty backlog |
| One giant round                   | Keep rounds small; report + let the user interrupt between them              |
