# AWS Full-Automation Checklist

Source pattern: Plinth/SansadLens's `apps/infra` (CDK v2) + `scripts/*`. Every AWS resource is
CDK-managed and every deploy is one command. There is deliberately **no CI pipeline** (single
production environment, deployed by hand from a developer machine with a named AWS profile) — "no
manual work" here means _no console click-ops and no hand-copied ARNs/ids_, not _no human runs a
command_. Say this plainly rather than overclaim: a short, fixed list of one-time steps genuinely
cannot be automated away (a registrar lives outside AWS; a GitHub PAT must be minted by a human).
Below is that full list, verified against the actual scripts and CDK source — not assumed.

## The pieces

| Path                                                                 | Role                                                                                                                                                                                                                   |
| -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/infra/src/plinth-stack.ts`                                     | Main stack: RDS `DatabaseInstance`, 3 auto-generated `secretsmanager.Secret`s (DB creds, session, export-url), SQS queues + DLQs, Lambda API/worker, EventBridge schedules, migration + seed CustomResources.          |
| `apps/infra/src/dns-stack.ts`                                        | `PlinthDns` — standalone Route53 hosted zone, idempotent, deployed every run regardless of app changes.                                                                                                                |
| `apps/infra/src/web-stack.ts`                                        | `PlinthWeb` — Amplify `App` with `GitHubSourceCodeProvider`, resolves the GitHub PAT via a Secrets Manager dynamic reference at deploy time.                                                                           |
| `apps/infra/src/lambda/migrate.ts`                                   | Runs `prisma migrate deploy` against the live DB. Wired as the `onEventHandler` of a `cr.Provider` (`MigrationProvider`) behind a `CustomResource` (`RunMigrations`).                                                  |
| `apps/infra/src/lambda/seed-topics.ts`                               | Upserts the curated `topics` vocabulary. Same `cr.Provider`/`CustomResource` pattern (`SeedTopicsProvider`/`RunSeedTopics`), ordered strictly after `RunMigrations`.                                                   |
| `apps/infra/src/migrations-hash.ts` / `seed-hash.ts`                 | Hash the migrations dir / seed source file into the `CustomResource`'s `properties` — CloudFormation only re-invokes the Lambda when the hash actually changes, so an unrelated deploy is a no-op for both.            |
| `scripts/aws-env.sh`                                                 | Resolves `AWS_PROFILE`/`CDK_DEFAULT_ACCOUNT`/`CDK_DEFAULT_REGION` into the shell via `aws sts get-caller-identity` — sourced (`. scripts/aws-env.sh`) by every `cdk:*` script so the operator never hand-exports them. |
| `scripts/deploy-prod.sh`                                             | The one deploy command: DNS → auto-resolve zone id/GitHub coords from `git remote` → diff → confirm → app (incl. migrations+seed) → web (Amplify, if the GitHub secret exists) → health check.                         |
| `scripts/verify-pre-deploy.sh`                                       | The one pre-deploy gate: install → lint → test → build → whole-app E2E (+ gated Playwright) → optional CDK synth. Fail-closed; this is the only place these checks run since there's no CI.                            |
| `scripts/env-sync.mjs` / `push-secrets-aws.sh` / `merge-secrets.mjs` | Local `.env.aws.prod` → `yarn env:sync:aws:prod` generates `apps/infra/.env.aws.prod.json` → `yarn secrets:push:prod` additive-merges it into Secrets Manager (adds new keys, never overwrites existing ones).         |

## What IS fully automated (verify against the source above, don't take on faith)

- [ ] **Deploy is one command** (`yarn deploy:prod`), idempotent on every rerun — no ClickOps in the
      AWS Console for any resource it touches.
- [ ] **DB migrations run automatically on deploy** — a CloudFormation `CustomResource` invokes a
      migration Lambda, hash-gated so unrelated deploys don't re-run it. Nobody runs
      `prisma migrate deploy` against prod by hand.
- [ ] **Reference vocabulary seeding runs automatically on deploy, in-VPC** — the DB is
      `publiclyAccessible:false`, so no laptop/agent could reach it to seed even if someone tried;
      the seed Lambda runs inside the VPC as a second `CustomResource`, strictly ordered after
      migrations, hash-gated the same way. **Do not trust a setup doc that tells you to run a seed
      script by hand post-deploy without first checking whether a `CustomResource` already covers
      it in the stack** — this exact repo had a stale manual instruction in `docs/SETUP.md` for a
      seed step that CDK had already automated; the code (`plinth-stack.ts`) is the source of
      truth, not the doc, when they disagree.
- [ ] **DNS zone id, nameservers, and GitHub owner/repo are auto-resolved** — `deploy-prod.sh` reads
      them from `aws cloudformation describe-stacks` and `git remote` respectively. Zero env vars
      to hand-copy for either.
- [ ] **The custom domain + DNS-validated ACM cert turn on automatically once delegation is live** —
      `deploy-prod.sh` checks via `dig` whether the zone's nameservers are already authoritative in
      public DNS before enabling them, so a deploy never hangs waiting on a cert that can't validate
      pre-delegation; it just re-checks and activates on the next run.
- [ ] **Recurring jobs are AWS-native schedules, not human/cron-triggered** — `EventBridge` rules
      (`EparlibEnqueueSchedule`, `ArchiveAuditSchedule`) post straight to SQS on a fixed cadence; no
      external scheduler, no server someone has to keep running.
- [ ] **Secrets are additive-merged, never silently clobbered** — `push-secrets-aws.sh` fetches the
      live secret, merges in only new keys, and refuses to overwrite an existing value.
- [ ] **AWS account/region resolution never needs a hand-set env var** — `aws-env.sh` derives them
      from the named profile via STS; `.env.prod` has no `CDK_DEFAULT_ACCOUNT` to maintain.

## What is genuinely, unavoidably manual (the honest short list)

- [ ] **Domain registrar nameserver delegation (one-time per domain).** `PlinthDns` prints 4
      nameservers as a CFN output; pointing the domain at them happens at the registrar, which is
      outside AWS entirely — no AWS API can reach into a third-party registrar's control panel.
- [ ] **The GitHub PAT for Amplify (one-time secret creation).** Amplify's git-connected SSR build
      needs a token only a human can mint (`aws secretsmanager create-secret --name
    plinth/prod/github-token --secret-string '<pat>'`) — everything downstream (owner/repo
      resolution, the dynamic reference at deploy time) is automatic once that one secret exists.
- [ ] **First-time AWS credential setup on a new machine.** `aws configure --profile plinth-prod`
      (or `aws configure sso`) — establishing a human's/CI-role's own AWS identity is inherently a
      one-time local action, not something a script inside the repo can do for you.
- [ ] **First-time CDK bootstrap per account/region** (`yarn cdk:bootstrap`) — creates the CDK
      staging bucket/roles; a one-time prerequisite before the first `cdk deploy` can run at all.
- [ ] **The very first Secrets Manager secret creation** (`aws secretsmanager create-secret --name
    plinth/prod/api-secrets ...`). After that one bootstrap, `yarn secrets:push:prod` handles every
      subsequent addition — but creating the secret resource itself the first time is a documented
      manual command, not scripted.
- [ ] **Updating an _existing_ secret's value (not adding a new key).** `push-secrets-aws.sh` /
      `merge-secrets.mjs` are additive-only by design (never overwrite) — rotating or correcting a
      value that's already live is explicitly left to `aws secretsmanager put-secret-value` or the
      AWS Console, on purpose, to prevent an accidental silent overwrite.
- [ ] **Copying first-deploy CloudFormation outputs into env files once** (e.g. Cognito
      `UserPoolId`/`ClientId` into `.env.prod`) — CDK provisions the resources, but wiring their ids
      into the app's own config the first time is a manual copy, not a script step.

## Anti-patterns

- Claiming "fully automated, zero manual steps" without checking this list — the two steps this
  repo's own docs call out as "the one manual step/secret nothing can automate" (registrar
  delegation, GitHub PAT) are real, permanent exceptions, not gaps to eventually close.
- Trusting a setup doc's manual-step instructions over the CDK source when they conflict — docs
  drift after a `CustomResource` automates something that used to be a manual runbook step; grep
  the stack file for the resource in question before repeating a doc's instruction.
- Hand-exporting `CDK_DEFAULT_ACCOUNT`/`CDK_DEFAULT_REGION` "just to be safe" — `aws-env.sh` already
  resolves both from the profile; a stale hand-set value can silently target the wrong account.
- Running `prisma migrate deploy` or a seed script by hand against the prod DB "to be sure" — both
  are already CDK-automated and hash-gated; a manual run outside that path bypasses the ordering
  guarantee (seed strictly after migrate) and the deploy's rollback-on-failure semantics.
- Overwriting a live secret value by re-running the additive push script and expecting it to
  update — it won't; that's the intentional guard rail, use `put-secret-value`/Console for updates.
- Standing up a CI pipeline to "finish the automation" without the user asking for one — this repo
  deliberately has none (§10, single prod env); local `verify-pre-deploy.sh` + `deploy-prod.sh` are
  the whole gate by design, not a placeholder for CI.
