---
name: repo-setup
description: Use when setting up a new repository from scratch, or bringing an existing one up to standard — proven checklists for DNS/CDK infra, ticket-board maintenance (incl. user-report/feature-ask intake with an owner-verify gate), internal-tooling (/tools) layout, subscription billing, copy-based UI text, transactional email, entitlements/capabilities, first-party marketing analytics, landing-page performance (Core Web Vitals/PageSpeed), SEO/GEO/AIO discoverability, root-run monorepo script organization (package.json + turbo), and local dev against real AWS resources (no local DynamoDB).
---

# Repository Setup

## Overview

Checklist reference for repository setup concerns proven out in production (Quri/OpsPilot,
Plinth/SansadLens). Each concern is a standalone checklist file — work through the relevant one
top to bottom when bootstrapping a new repo, onboarding an existing one, or auditing current
practice against it.

Two kinds of checklist live here: **technical** (file paths, scripts, config — how a specific
practice is actually wired) and **process** (no code, no file paths — what to decide and in what
order, before or independent of any specific tech stack). The table's "Use for" column makes clear
which is which; several process checklists pair with a technical one covering the same ground.

## When to Use

- Starting a brand-new repository and want the proven DNS setup in place from day one.
- Auditing an existing repo's DNS/CDK setup against this known-good pattern.
- Diagnosing a DNS outage (missing record, cert, or custom-domain mapping) and need the check order.
- Adding/changing a DNS record and want the file-to-deploy path, not a console edit.
- Standing up (or auditing) a frontmatter-driven ticket board plus its non-shippable internal
  tooling home (`/tools`).
- Standing up (or auditing) a single-command, CDK-only AWS deploy with no console-first resources
  and a short, explicit list of the few steps that are genuinely one-time-manual.
- Standing up (or auditing) subscription billing, a copy-based UI-text package, transactional
  email, plan/capability entitlements, or first-party marketing analytics from scratch.
- Building (or rescuing) a paid-traffic landing page — Core Web Vitals/PageSpeed architecture,
  measurement methodology, `NO_LCP` debugging, third-party script tiering.
- Standing up search + AI-engine discoverability (SEO, GEO/AIO): sitemap/robots/canonicals,
  JSON-LD, llms.txt, programmatic SEO surfaces, IndexNow.
- Organizing (or auditing) a monorepo so every command — dev servers, builds, tests, e2e,
  env sync, deploys, CDN invalidation — runs from a root `package.json` script (yarn workspaces +
  turbo delegation, colon-namespaced naming, AWS-profile wrapper scripts).
- Setting up (or onboarding to) a local dev environment that runs app processes on the laptop but
  points at real AWS dev-account resources (DynamoDB, Cognito) via a named profile — skipping the
  DynamoDB-Local/Docker emulator path.
- Bootstrapping a brand-new repo end to end with an LLM (governance-before-code, ticket board as
  day-one roadmap, CI wired but honestly disabled until it has something to build) rather than
  growing governance incrementally.

## Checklists

| Checklist                                                                              | Use for                                                                                                                                                                                                                 |
| -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [checklists/aws-dns-maintenance.md](checklists/aws-dns-maintenance.md)                 | JSON-driven Route53 zone + records, ACM cert, custom-domain mapping, deploy scripts, outage diagnosis                                                                                                                   |
| [checklists/ticket-board-and-tools.md](checklists/ticket-board-and-tools.md)           | Frontmatter-status ticket board (backlog/icebox/archive tiers) + the `inbox/` intake tier (feature-asks/reported-issues with an owner-verify gate), its CLI engine, and the `/tools` internal-ops folder it lives in    |
| [checklists/aws-full-automation.md](checklists/aws-full-automation.md)                 | One-command CDK deploy (DNS → app → web), auto-migrations/auto-seed via CustomResource, secrets pipeline, verify-before-deploy gate, and the honest short list of what's still manual                                   |
| [checklists/llm-native-repo-bootstrap.md](checklists/llm-native-repo-bootstrap.md)     | The exact first-3-commit sequence an LLM used to bootstrap a repo from zero: reference-repo research, governance-before-code, brand/copy packages first, ticket board as day-1 roadmap, CI wired-then-honestly-disabled |
| [checklists/billing.md](checklists/billing.md)                                         | Provider-agnostic subscription snapshot, signature-verified idempotent webhook, plan/pricing source of truth, trial + past-due delinquency handling                                                                     |
| [checklists/copy-based-structure.md](checklists/copy-based-structure.md)               | A `@repo/copy`-style package so every user-visible string is a named export, not a JSX literal — page constants, dynamic-copy functions, email copy, enforcement mechanism                                              |
| [checklists/email-service.md](checklists/email-service.md)                             | Transactional email (SES-style): send/retry/template layers, auth-flow vs. product-notification delivery paths, deliverability DNS, copy-package integration                                                            |
| [checklists/entitlements.md](checklists/entitlements.md)                               | Boolean capability schema, admin/staff resolution, billing-plan clamping, single server-side enforcement chokepoint, client read-only capability consumption                                                            |
| [checklists/marketing-analytics-setup.md](checklists/marketing-analytics-setup.md)     | First-party event-log table + GSIs, client beacon ingestion, capability-gated dashboards/MCP tools, bootstrap order from empty repo to first funnel                                                                     |
| [checklists/landing-page-performance.md](checklists/landing-page-performance.md)       | Paid-traffic landing CWV architecture: route-group provider isolation, static+server-slot rendering, script tiering, CDN caching, Lighthouse measurement methodology, the `NO_LCP` scroll-snap trap                     |
| [checklists/seo-geo-aio.md](checklists/seo-geo-aio.md)                                 | Search + AI-engine discoverability: data-driven sitemap/robots, canonical discipline, JSON-LD `@graph`, OG images, programmatic SEO surfaces, llms.txt/llms-full.txt, machine-readable mirrors, IndexNow                |
| [checklists/root-scripts-organization.md](checklists/root-scripts-organization.md)     | Root-as-single-entry-point script surface for a yarn+turbo monorepo: colon-namespaced script families, turbo vs `yarn workspace` delegation, env-sync prefix steps, AWS-profile wrappers, one-command deploy pipeline   |
| [checklists/local-dev-against-aws.md](checklists/local-dev-against-aws.md)             | Local dev servers (web/api/ops) pointed at REAL AWS dev resources — `DYNAMODB_ENDPOINT`-unset mechanism, `AWS_PROFILE` credential chain, real Cognito login, what's intentionally off locally, skipped emulator path    |
| [checklists/governance-rulebook.md](checklists/governance-rulebook.md) (process)       | Deciding and writing a project's non-negotiable rulebook before any code — what to decide, in what order                                                                                                                |
| [checklists/ai-harness-setup.md](checklists/ai-harness-setup.md) (process)             | Deciding how an AI coding assistant should behave in a repo — what's repeated every turn, what's blocked outright, what's automatic                                                                                     |
| [checklists/cicd-bootstrap.md](checklists/cicd-bootstrap.md) (process)                 | Deciding the release-gate philosophy for a new repo — automatic pipeline vs. controlled human-run process, honest disable-if-broken                                                                                     |
| [checklists/onboarding-docs.md](checklists/onboarding-docs.md) (process)               | Writing the newcomer path from zero to first change — what to separate, what to record, why stale docs are worse than none                                                                                              |
| [checklists/ticket-board-process.md](checklists/ticket-board-process.md) (process)     | Deciding how work will be tracked before work begins — backlog-as-roadmap, states, dependencies, the permanent "won't build" list                                                                                       |
| [checklists/brand-copy-foundations.md](checklists/brand-copy-foundations.md) (process) | Deciding a product's identity, voice, and visual constants once, before any user-facing screen exists                                                                                                                   |
| [checklists/env-secrets-workflow.md](checklists/env-secrets-workflow.md) (process)     | Deciding how config/secrets are managed across environments — the honest short list of what stays manual                                                                                                                |
| [checklists/repo-tooling-standards.md](checklists/repo-tooling-standards.md) (process) | Deciding shared tooling conventions (strictness, one test/lint tool, one package manager) before a codebase grows past them                                                                                             |

## Adding a New Checklist

Same pattern: one `checklists/<topic>.md` per setup concern, checkbox items, sourced from a repo
where the practice actually worked — not a theoretical best-practice list. Link the new file from
the table above.
