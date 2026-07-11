# LLM-Native Repo Bootstrap Checklist

Source pattern: Plinth/SansadLens's actual first 3 commits (2026-06-22), reconstructed from `git
log --reverse` and the founding Claude Code session transcript — not a theoretical ideal. The repo
was empty; everything below is what really happened, in order, including the mistakes caught the
same day.

## Contents

- The founding prompt (verbatim intent, paraphrased length)
- Commit 1 — `chore: bootstrap Plinth monorepo, governance, and Strategy v2 ticket board`
- Commit 2 — a same-day correctness fix on the architecture just written
- Commit 3 — `chore(ci): disable CI and deploy workflows until implementation is complete`
- Full Inventory — à la carte menu (150 files, commit 1 alone)
- Anti-patterns

## The founding prompt (verbatim intent, paraphrased length)

> "There are three amazing repos locally present called FinanceTracker, Relay and OpsPilot. Review
> each in depth — architecture, CLAUDE.md and similar files, env setup, ticketing, entitlements,
> LLMs, good practices, constraints for LLMs. This repo will be completely built using LLMs. Copy
> the best architecture, conditions and infra that suits this repo based on Idea.md. Create an
> amazing setup — LLM hooks, skills, rules, a well-ordered CLAUDE.md. Use Karpathy's guidelines,
> and use the internet."

Note what's absent: no ask for a single line of product code. The entire first session was
research + governance authoring. `Idea.md` (the product-vision doc referenced) was a local file,
**never committed to git** — it was read once, then distilled into `CLAUDE.md` §0 and
`docs/PRODUCT-STRATEGY.md`, not kept around as a living doc.

## Commit 1 — `chore: bootstrap Plinth monorepo, governance, and Strategy v2 ticket board`

The entire governance + tooling layer landed in one commit, before any product code:

- [ ] `CLAUDE.md` authored FIRST, as the single override-default-behaviour rulebook (this repo's
      is 17 sections: product invariants, architecture/layer rules, TDD, logic placement,
      config/secrets, LLM safety + cost, entitlements, ingestion, i18n, commits, verification,
      no-placeholders, tooling, ticket board, Karpathy rules, SEO, brand).
- [ ] `.claude/settings.json` + a project skill (`feature-factory`) committed alongside — hooks and
      skills are part of "the repo," not an afterthought bolted on later.
- [ ] Two **governance packages**, not product packages, scaffolded first and only:
      a brand-constants package (single source for name/colors/domains/routes) and a copy/i18n
      package (single source for every user-visible string, English as source-of-truth locale).
      Neither has product logic — they exist so every later ESLint/CI rule has something real to
      enforce against from day one.
- [ ] CI workflows (`ci.yml`, `deploy-prod.yml`) added in the SAME commit as everything else, even
      though nothing exists yet for them to build — the pipeline's shape is part of the scaffold,
      not something bolted on once there's code.
- [ ] The ticket board stood up FULLY, not incrementally: this repo shipped **69 active + 10
      icebox tickets in commit 1** — the backlog _is_ the roadmap document, written before any
      ticket is started, not filled in as work is discovered.
- [ ] A product-strategy doc (`docs/PRODUCT-STRATEGY.md`) and dated specs
      (`docs/specs/YYYY-MM-DD-*.md`) committed alongside the tickets — the "why" behind the backlog
      is recorded once, not left implicit in the ticket titles.
- [ ] Tooling docs (`docs/guidelines/architecture.md`, `testing.md`, `data-sources.md`,
      `llm-safety.md`, `env-management.md`) and a full onboarding checklist (`docs/SETUP.md`)
      committed in the same pass — a new developer (or a fresh LLM instance with zero memory)
      should be able to read the repo and know exactly how to work in it.
- [ ] Whichever model authored this commit is recorded honestly in the trailer
      (`Co-Authored-By: Claude Opus 4.8 ...`) — reserve the largest/most-capable model for the
      one-time, architecture-defining commit; it doesn't have to be the same model used for
      routine feature work later.

## Commit 2 — a same-day correctness fix on the architecture just written

`chore(db): managed AWS Postgres direct (no local DB) + whole-app test harness tickets` — landed
**10 minutes after commit 1**. The original scaffold had assumed a local/Dockerized Postgres for
dev; this was wrong for the actual target (managed AWS RDS/Aurora, accessed directly, no Docker).

- [ ] Re-read your own just-written CLAUDE.md/`.env.example`/onboarding doc with a critical eye
      immediately after the initial dump, before writing any product code — don't assume the first
      pass got every infra decision right.
- [ ] When you correct a hosting/infra assumption, fix it consistently across ALL of: the
      CLAUDE.md section that states it, `.env.example`, the onboarding checklist (`docs/SETUP.md`),
      and any ticket whose acceptance criteria assumed the old model — a partial fix leaves
      contradictory instructions for the next session to trip over.
- [ ] Audit your own `.gitignore` for collateral damage from a blanket rule right away — this repo's
      blanket `.env.*` ignore had silently swallowed `.env.example`, the one env file meant to be
      committed (§5's mandatory source-of-truth inventory). Caught and fixed same commit.
- [ ] File the "we'll need this eventually" tickets (whole-app integration-test harness,
      pre-deploy-verification pipeline) as soon as the gap is spotted — don't wait for the feature
      that needs them to also need the ticket.

## Commit 3 — `chore(ci): disable CI and deploy workflows until implementation is complete`

Landed ~5 minutes after commit 2. The CI/deploy workflows wired in commit 1 were real — and
immediately known to be broken (deploy job has no AWS credentials yet; typecheck fails on a
tsconfig deprecation) because there was no app code for them to build.

- [ ] When a just-wired CI/CD pipeline can't possibly pass yet, **disable it explicitly and
      immediately** — rename `*.yml` → `*.yml.disabled` (not delete, not leave it red on main).
- [ ] State the exact re-enable condition in the commit body — this repo's said "once the app
      scaffolds and a managed dev environment are in place," plus named the specific known bug
      to fix first (`esModuleInterop`/`allowSyntheticDefaultImports` deprecation needing
      `ignoreDeprecations: "6.0"`).
- [ ] Never leave a failing/red pipeline sitting on `main` "to fix later" — a disabled pipeline
      with a stated condition is honest; a red one is noise nobody trusts.
- [ ] (Downstream reality check, from this repo's later state): these workflow files were
      eventually removed from git entirely rather than re-enabled — CI never came back; the repo
      moved to a local-only `verify-pre-deploy.sh` + `deploy-prod.sh` gate instead (see
      [checklists/aws-full-automation.md](aws-full-automation.md)). A "temporarily disabled"
      pipeline is a real fork in the road, not guaranteed to return — decide on purpose, don't let
      it happen by neglect.

## Full Inventory — à la carte menu (150 files, commit 1 alone)

Everything below is a real file/decision from this repo's actual bootstrap commit (`git show
--stat e3dc644`), grouped by concern. This is a MENU, not a sequence — check off only what your
new repo actually needs; several groups (the icebox topics, the specific ticket domains) are
Plinth-specific and exist here only as an example of the _pattern_ to replace with your own.

**Governance rulebook** (adopt section-by-section, not all-or-nothing):

- [ ] `CLAUDE.md` §0 Product Invariants — the non-negotiable, product-specific "moat" rules
- [ ] §1 The Golden Path — spec → failing tests → minimal impl → verify → ship, one exact sequence
- [ ] §2 Architecture — hexagonal/ports-and-adapters package map + import layer rules
- [ ] §3 Test-First (TDD-as-Spec) — test framework choice, co-location, registration requirement
- [ ] §4 Logic Placement — a table of "what kind of code goes in which package"
- [ ] §5 Config & Secrets — `.env.example` as source of truth, mandatory-var comment convention
- [ ] §6 LLM Safety — AI-is-utility-not-authority rules, output validation requirement
- [ ] §6A LLM Cost Efficiency — cache-first/cheapest-model/batch-first cost discipline
- [ ] §7 Entitlements — default-deny capability gating
- [ ] §8 Data Ingestion Rules — idempotency, source-of-truth validation at the boundary
- [ ] §9 User-Visible Text & i18n — single copy package, zero string literals in JSX
- [ ] §10 Commits & Branches — conventional commits, model co-author trailer, package manager lock
- [ ] §11 Verification Before Done — the done-checklist (tests, build, lint, ticket status)
- [ ] §12 No Placeholders — TBD/stub/unregistered-test ban
- [ ] §13 Tooling & Language — strict TS, lint config, test runner, node/yarn version pins
- [ ] §14 Ticket Board — frontmatter-status board spec (see
      [ticket-board-and-tools.md](ticket-board-and-tools.md) for the full engine)
- [ ] §15 Karpathy Rules — think-before-coding / simplicity-first / surgical-changes / goal-driven
- [ ] §16 SEO & Distribution — SSR-everywhere, stable URL, citation, structured-data requirements
- [ ] §17 Brand Package — single source of truth for name/colors/domains, enforced no-hardcode rule

**Claude Code harness config:**

- [ ] `.claude/settings.json` — SessionStart hook (branch/context banner)
- [ ] `.claude/settings.json` — UserPromptSubmit hook (re-inject engineering principles every turn)
- [ ] `.claude/settings.json` — PreToolUse hook (block real `.env` edits, block migration-file edits,
      block force-push to main)
- [ ] `.claude/settings.json` — PostToolUse hook (auto-run Prettier on every file edit)
- [ ] `.claude/skills/feature-factory/SKILL.md` — a project-specific implementation-loop skill
- [ ] `.graphifyignore` — exclude generated/vendor paths from the codebase knowledge graph
- [ ] `.serena/project.yml` + `.serena/.gitignore` — Serena MCP project registration

**CI/CD** (see also `Commit 3` above for the disable-until-ready lesson):

- [ ] `.github/workflows/ci.yml` — lint + typecheck + test + build + CDK synth on push/PR
- [ ] `.github/workflows/deploy-prod.yml` — deploy on push to main via OIDC

**Onboarding & guideline docs:**

- [ ] `docs/SETUP.md` — phased onboarding checklist, prerequisites through first prod deploy
- [ ] `docs/FEATURES.md` — feature request/landing tables + explicit non-goals
- [ ] `docs/PRODUCT-STRATEGY.md` — the distilled product vision (this repo's `Idea.md` → here)
- [ ] `docs/guidelines/architecture.md` — package dependency graph, pipeline diagrams
- [ ] `docs/guidelines/testing.md` — test layers, fixture pattern, runner choice
- [ ] `docs/guidelines/data-sources.md` — external data source inventory + fetch strategy
- [ ] `docs/guidelines/llm-safety.md` — AI may/must-never table, prompt engineering rules
- [ ] `docs/guidelines/env-management.md` — env-tier model, where `process.env` is/isn't allowed
- [ ] `docs/specs/YYYY-MM-DD-<slug>.md` — dated, immutable spec-per-decision convention
- [ ] `docs/superpowers/plans/*.md` + `docs/superpowers/specs/*.md` — keep brainstorming/design
      artifacts as committed history, not thrown away after the decision is made

**Ticket board — engine + seed backlog:**

- [ ] `docs/tickets/README.md` — board conventions doc
- [ ] `docs/tickets/_board/{board.json,icebox.json,archive.jsonl}` — generated indexes (see
      [ticket-board-and-tools.md](ticket-board-and-tools.md))
- [ ] `tools/internal-ops/board/*.mjs` (+ matching `*.test.mjs`) — the CLI engine: `cli`, `parse`,
      `frontmatter`, `validate`, `generate`, `merge`, `waves`, `migrate`
- [ ] `tools/internal-ops/web/server.mjs` + `public/{index,board,setup}.html` — a tiny internal-ops
      dashboard for browsing the board/onboarding checklist in a browser
- [ ] `tools/internal-ops/graph/canonicalize.py` — a one-off graph utility (project-specific)
- [ ] Seed the backlog with your OWN domains, not these — the pattern this repo used, as reference:
  - [ ] Data-adapter tickets, one per external source (this repo: 7 — committee reports, data.gov
        bills, election data, eparlib transcripts, Lok Sabha/Rajya Sabha debates, OpenSanctions)
  - [ ] AI/LLM tickets (this repo: cost-guard, debate-summarisation, entity-extraction,
        topic-classification)
  - [ ] Public API tickets, one per resource (this repo: bill, debate, mp-profile,
        platform-public, universal-search)
  - [ ] App-scaffold tickets, one per deployable (this repo: api, infra-cdk, web, worker)
  - [ ] Package tickets, one per hexagonal package (this repo: api-framework, copy-i18n,
        core-contracts, db-prisma, entitlements, entity-resolver, graph-traversal,
        ingestion-pipeline, llm-anthropic, schemas-zod, search-fts)
  - [ ] Web-page tickets, one per route (this repo: bill/debate/mp-profile/topic pages,
        command-palette, dark-theme, i18n, pwa-manifest, shared-components, source-citation,
        statement-archive, universal-search, global-states, position-history)
  - [ ] Product-invariant tickets (this repo: evidence-layer-statement-status,
        evidence-reliability-profile, cross-linking-statements, north-star-coverage-metric,
        source-trust-charter) — tickets that exist purely to implement a CLAUDE.md §0-style rule
  - [ ] Growth/monetization tickets (this repo: alerts, exports, promise-archive,
        research-workspace, subscriptions-billing, topic-digest, seo-at-scale)
  - [ ] Ops/infra tickets (this repo: auth-accounts, brand-enforcement, ci-pipeline,
        copy-lint-guard, db-schema x2, monorepo-scaffold-finalize)
  - [ ] **An icebox tier for explicitly forbidden features** — this repo's icebox holds 10
        guardrail tickets (things like scoring/ranking/sentiment/prediction) that its own
        neutrality mandate forbids; adopt the PATTERN (a permanent, indexed "we will not build
        this and here's why" list) even if your specific forbidden topics differ entirely.

**Governance packages** (zero product logic, built before any product code):

- [ ] A brand-constants package (`packages/brand/src/index.ts` + `package.json` + `tsconfig.json`)
      — single source for name/tagline/colors/domains/emails/routes
- [ ] A copy/i18n package (`packages/copy/`) — `index.ts`, `locales.ts`, `messages/index.ts`,
      `messages/en/{common,errors,nav,search}.ts`, a completeness test (`copy.test.ts`), `README.md`

**Env & secrets pipeline:**

- [ ] `.env.example` — full var inventory with the mandatory-star (`# *`) comment convention
- [ ] `scripts/env-sync.mjs` — fan root env file out to every app's own env file
- [ ] `scripts/merge-secrets.mjs` — additive-only merge logic for a cloud secrets manager
- [ ] `scripts/push-secrets-aws.sh` — interactive, confirms-before-pushing secrets uploader
- [ ] `scripts/verify-pre-deploy.sh` — the one local pre-deploy gate (install/lint/test/build/e2e)
- [ ] `scripts/deploy-prod.sh` — the one-command production deploy
- [ ] `scripts/verify-touched.sh` — scoped build+test for only the packages a change touched

**Repo-wide tooling/config:**

- [ ] `tsconfig.base.json` — shared strict TypeScript config every package extends
- [ ] `turbo.json` — monorepo task graph (build/lint/test/typecheck/dev pipelines + caching)
- [ ] `eslint.config.mjs` — flat ESLint config, `--max-warnings 0` as the enforced bar
- [ ] `.gitignore` — node_modules/.next/.turbo/real-env-files/cdk.out, WITH an explicit carve-out
      so `.env.example` itself stays tracked (see Commit 2's fix below)
- [ ] Root `package.json` scripts: `dev`/`build`/`lint`/`typecheck`/`test` + every `env:sync:*` and
      deploy/CDK script as a named, documented one-liner — nobody should need to remember a raw
      `cdk deploy` invocation
- [ ] Package-manager lock committed (`yarn.lock`), with a `preinstall` guard blocking the wrong
      package manager (`only-allow yarn`)

## Anti-patterns

- Writing product code before the governance layer (CLAUDE.md, brand/copy packages, ticket board,
  onboarding doc) exists — this repo's entire first session was research + governance, zero
  product code.
- Treating the bootstrap commit as something to split into small PRs — this is the one legitimate
  exception to the ~200-400-line phased-delivery rule, since there is no product code yet to phase
  work against. Everything AFTER the bootstrap commit follows normal phased delivery.
- Wiring CI/CD and leaving it red because "we'll fix it once there's code" — disable it with a
  named re-enable condition instead, same session.
- A blanket `.gitignore` rule (`.env.*`) that also swallows the one env file meant to be committed
  (`.env.example`) — check for this collateral damage the moment you write such a rule.
- Keeping a product-vision doc (`Idea.md`-style) as a living reference instead of distilling it
  once into CLAUDE.md/product-strategy docs — the source doc here was read once and never
  committed; the distilled version is the one that's maintained.
