---
name: repo-setup
description: "Production-proven repo setup and audit checklists. Use when bootstrapping a new repository or standing up/auditing one concern — DNS/CDK, ticket board, one-command AWS deploy, billing, copy package, email, entitlements, analytics, landing-page performance, SEO/GEO/AIO, root scripts, local dev against real AWS — or when the user says 'set up the repo', 'bootstrap the project', 'audit our setup', 'bring the repo up to standard'. Not for designing features — use feature-start."
---

# Repository Setup

## Overview

Router over 21 setup checklists, one file per concern under `checklists/`. **Every checklist is
sourced from a repo where the practice actually worked in production (Quri/OpsPilot,
Plinth/SansadLens, Extrack/FinanceTracker) — never a theoretical best-practice list.** Pick the
matching row below and work that one file top to bottom; do not improvise a setup that a
checklist already covers.

## When to use / when NOT to use

Use when:

- Bootstrapping a new repository (end to end with an LLM → start at `llm-native-repo-bootstrap`).
- Standing up one concern from the table in a new or existing repo.
- Auditing an existing repo against known-good practice, or diagnosing a failure in a covered
  area (DNS outage check order, `NO_LCP` on a landing page, broken board indexes).

NOT for:

- Designing or building product features — use feature-start.
- Working tickets on an existing board — use backlog-detail / backlog-drain. The board
  checklists here cover standing up and maintaining the board itself.
- Reviewing finished code — use review-uncommitted / review-branch.

## How to use a checklist

1. Route via the table below and open exactly the file(s) named — links are one level deep.
2. Note the kind: **technical** rows give file paths, scripts, and config — how the practice is
   actually wired. **(process)** rows contain no code or file paths — what to decide and in what
   order, before or independent of any tech stack. Several process rows pair with a technical
   row on the same ground (e.g. `ticket-board-process` ↔ `ticket-board-and-tools`).
3. Work the checklist top to bottom, ticking items off. Never skip an item silently — record a
   skipped item with its reason, so an audit stays honest.
4. Repo names, paths, and script names inside a checklist are worked examples from the source
   repo — adapt the names to the target repo, keep the mechanism.

## Checklists (the router)

| Checklist                                                                              | Use for                                                                                                                                                                                                                          |
| -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [checklists/aws-dns-maintenance.md](checklists/aws-dns-maintenance.md)                 | JSON-driven Route53 zone + records, ACM cert, custom-domain mapping, record changes via file-to-deploy (never a console edit), DNS outage diagnosis check order                                                                  |
| [checklists/ticket-board-and-tools.md](checklists/ticket-board-and-tools.md)           | Frontmatter-status ticket board (backlog/icebox/archive tiers) + the `inbox/` intake tier (feature-asks/reported-issues with an owner-verify gate), its CLI engine, and the `/tools` internal-ops folder it lives in             |
| [checklists/aws-full-automation.md](checklists/aws-full-automation.md)                 | One-command CDK-only deploy (DNS → app → web), no console-first resources, auto-migrations/auto-seed via CustomResource, secrets pipeline, verify-before-deploy gate, the honest short list of what is genuinely one-time-manual |
| [checklists/llm-native-repo-bootstrap.md](checklists/llm-native-repo-bootstrap.md)     | The exact first-3-commit sequence an LLM used to bootstrap a repo from zero: reference-repo research, governance-before-code, brand/copy packages first, ticket board as day-1 roadmap, CI wired-then-honestly-disabled          |
| [checklists/billing.md](checklists/billing.md)                                         | Provider-agnostic subscription snapshot, signature-verified idempotent webhook, plan/pricing source of truth, trial + past-due delinquency handling                                                                              |
| [checklists/copy-based-structure.md](checklists/copy-based-structure.md)               | A `@repo/copy`-style package so every user-visible string is a named export, not a JSX literal — page constants, dynamic-copy functions, email copy, enforcement mechanism                                                       |
| [checklists/email-service.md](checklists/email-service.md)                             | Transactional email (SES-style): send/retry/template layers, auth-flow vs. product-notification delivery paths, deliverability DNS, copy-package integration                                                                     |
| [checklists/entitlements.md](checklists/entitlements.md)                               | Boolean capability schema, admin/staff resolution, billing-plan clamping, single server-side enforcement chokepoint, client read-only capability consumption                                                                     |
| [checklists/marketing-analytics-setup.md](checklists/marketing-analytics-setup.md)     | First-party event-log table + GSIs, client beacon ingestion, capability-gated dashboards/MCP tools, bootstrap order from empty repo to first funnel                                                                              |
| [checklists/landing-page-performance.md](checklists/landing-page-performance.md)       | Paid-traffic landing CWV/PageSpeed architecture: route-group provider isolation, static+server-slot rendering, third-party script tiering, CDN caching, Lighthouse measurement methodology, the `NO_LCP` scroll-snap trap        |
| [checklists/seo-geo-aio.md](checklists/seo-geo-aio.md)                                 | Search + AI-engine discoverability: data-driven sitemap/robots, canonical discipline, JSON-LD `@graph`, OG images, programmatic SEO surfaces, llms.txt/llms-full.txt, machine-readable mirrors, IndexNow                         |
| [checklists/root-scripts-organization.md](checklists/root-scripts-organization.md)     | Root-as-single-entry-point script surface for a yarn+turbo monorepo: colon-namespaced script families, turbo vs `yarn workspace` delegation, env-sync prefix steps, AWS-profile wrappers, one-command deploy pipeline            |
| [checklists/local-dev-against-aws.md](checklists/local-dev-against-aws.md)             | Local dev servers (web/api/ops) pointed at REAL AWS dev resources — `DYNAMODB_ENDPOINT`-unset mechanism, `AWS_PROFILE` credential chain, real Cognito login, what is intentionally off locally, the skipped Docker-emulator path |
| [checklists/governance-rulebook.md](checklists/governance-rulebook.md) (process)       | Deciding and writing a project's non-negotiable rulebook before any code — what to decide, in what order                                                                                                                         |
| [checklists/ai-harness-setup.md](checklists/ai-harness-setup.md) (process)             | Deciding how an AI coding assistant should behave in a repo — what's repeated every turn, what's blocked outright, what's automatic                                                                                              |
| [checklists/cicd-bootstrap.md](checklists/cicd-bootstrap.md) (process)                 | Deciding the release-gate philosophy for a new repo — automatic pipeline vs. controlled human-run process, honest disable-if-broken                                                                                              |
| [checklists/onboarding-docs.md](checklists/onboarding-docs.md) (process)               | Writing the newcomer path from zero to first change — what to separate, what to record, why stale docs are worse than none                                                                                                       |
| [checklists/ticket-board-process.md](checklists/ticket-board-process.md) (process)     | Deciding how work will be tracked before work begins — backlog-as-roadmap, states, dependencies, the permanent "won't build" list                                                                                                |
| [checklists/brand-copy-foundations.md](checklists/brand-copy-foundations.md) (process) | Deciding a product's identity, voice, and visual constants once, before any user-facing screen exists                                                                                                                            |
| [checklists/env-secrets-workflow.md](checklists/env-secrets-workflow.md) (process)     | Deciding how config/secrets are managed across environments — the honest short list of what stays manual                                                                                                                         |
| [checklists/repo-tooling-standards.md](checklists/repo-tooling-standards.md) (process) | Deciding shared tooling conventions (strictness, one test/lint tool, one package manager) before a codebase grows past them                                                                                                      |

## Adding a new checklist

Same pattern, non-negotiable:

- One `checklists/<topic>.md` per setup concern, written as checkbox items an agent can tick off.
- Sourced from a repo where the practice actually worked — not a theoretical best-practice list.
  WHY: provenance is this skill's entire value; one invented item poisons trust in every row.
- Open the file with a `Source pattern: <repo/area>` line (every existing checklist does).
- If the file exceeds 100 lines, add a `## Contents` section listing its H2/H3 headers so
  partial reads still reveal scope.
- Add a router-table row above with a sharp "use for" phrase; mark process checklists `(process)`.
