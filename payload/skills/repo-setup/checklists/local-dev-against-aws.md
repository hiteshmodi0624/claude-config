# Local Dev Against Real AWS Checklist

Source pattern: Extrack/FinanceTracker. Local development runs the real app processes on the
laptop (Next.js web, Express-wrapped Lambda API, ops console) but points them at **the real AWS
dev account** — real DynamoDB dev tables, real dev Cognito user pool — via a named AWS profile.
There is a self-contained DynamoDB-Local/Docker path in the repo (`docker:up` + `db:local:*`);
**this checklist deliberately skips it** — the team does not use it. Verified against the actual
source, not the README (which still documents the local-Docker path as the default story).

## The one crucial mechanism

`packages/database/src/local/client.ts` (`getDynamoBaseClient`) branches purely on
**`DYNAMODB_ENDPOINT`**:

- **Set** (`http://localhost:8000`) → local emulator, dummy creds `local/local`.
- **Unset** → no endpoint/credentials override → AWS SDK **default credential provider chain** →
  resolves `AWS_PROFILE` → **real AWS dev DynamoDB** in `AWS_REGION` (default `ap-south-1`).

So "use only AWS db" = **leave `DYNAMODB_ENDPOINT` unset, set `AWS_PROFILE=extrack-dev`, and set
the `DYNAMODB_*_TABLE` vars to the real CDK-generated physical names**
(`ExtrackDatabaseDev-Accounts…` etc.). One env var per table (`DYNAMODB_ACCOUNTS_TABLE`,
`DYNAMODB_TRANSACTIONS_TABLE`, `DYNAMODB_CATEGORIES_TABLE`, …) — there is no single-table var;
non-core tables fail-soft when their var is empty.

⚠️ **The committed `.env.local.example` ships the OTHER path** — it uncomments
`DYNAMODB_ENDPOINT=http://localhost:8000`, uses `extrack-local-*` table names, and has no
`AWS_PROFILE` line. Copying it verbatim gives you the Docker-emulator setup. The real-AWS variant
is a hand edit on top (remove endpoint, add profile, real table names). Same for
`apps/api/.env.example`.

## Environment plumbing

- [ ] **One gitignored root `.env.local` is the single source**; `yarn env:sync:local`
      (`scripts/env-sync.mjs`, auto-run as the first half of `yarn dev`) fans it out to:
  - `apps/web/.env.local` ← `NEXT_PUBLIC_*`, `PLAYWRIGHT_*`, `E2E_*`, `EXTRACK_DEV_API_ORIGIN`
  - `apps/api/.env` ← everything else (AWS profile/region, table names, Cognito ids, secrets)
  - `apps/ops/.env.local` ← `DEV_TOOLS_*` only
  - Generated files are stamped "do not edit by hand". Missing `.env.local` → warning (non-fatal);
    the API's own `predev` env check (`check-local-dev-env.ts`, gated on
    `LOCAL_API_DEV_REQUIRED_ENV_KEYS`: `AWS_REGION` + accounts/categories/transactions table vars)
    then hard-exits with the real error.
- [ ] **Secrets come from `.env`, not Secrets Manager, locally.**
      `ensureLambdaSecretsLoaded()` is an explicit no-op when `EXTRACK_API_SECRETS_SECRET_ARN` is
      unset — so Razorpay/LLM/CAPI keys live as plain keys in root `.env.local` → `apps/api/.env`.
      Keep the ARN commented out locally.

## What runs on `yarn dev`

`yarn dev` = `yarn env:sync:local && npx turbo run dev` (turbo `dev`: `dependsOn ^build`,
uncached, persistent). Three processes:

| Process  | Command                                             | Port  | Notes                                                                                                      |
| -------- | --------------------------------------------------- | ----- | ---------------------------------------------------------------------------------------------------------- |
| api      | `tsx watch src/dev-server.ts` (`NODE_ENV=development`) | 3001  | Express wrapper converting each request to an API Gateway event and calling the **same Lambda handler** as prod (`src/lambda.ts`) — identical router locally. Raw-body carve-out for the Razorpay webhook path. `predev` builds `@repo/database` + runs env preflight. |
| web      | `next dev --port 3000`                              | 3000  | `predev` builds web's upstream packages via turbo filter.                                                    |
| ops      | `next dev --port 3010`                              | 3010  | Starts too (turbo dev is unfiltered); `yarn dev:web-api` excludes it.                                        |

- [ ] **Web→API wiring, two modes** (`apps/web/next.config.mjs`):
  - Dev proxy: `/api/*` rewrites to `EXTRACK_DEV_API_ORIGIN ?? http://127.0.0.1:3001` — only when
    `NODE_ENV=development` AND `NEXT_PUBLIC_API_URL` unset (and proxy not disabled via
    `NEXT_PUBLIC_EXTRACK_DEV_PROXY_API=0`).
  - Direct: setting `NEXT_PUBLIC_API_URL=http://127.0.0.1:3001` disables the rewrite; browser
    calls the API origin directly (current team setup). Ops uses the proxy mode.

## What talks to REAL AWS from the laptop

- [ ] **DynamoDB** — dev-account tables, via `AWS_PROFILE=extrack-dev` credentials (profile set in
      `.env.local`, loaded by dotenv in the API; SSO or static keys both fine — code is agnostic).
      You are reading/writing shared dev data; no isolation between developers.
- [ ] **Cognito** — local login is REAL: web uses the dev user pool
      (`NEXT_PUBLIC_COGNITO_USER_POOL_ID` / `CLIENT_ID` / `HOSTED_UI_DOMAIN`), API validates the
      JWTs (`aws-jwt-verify`) against the same pool (`COGNITO_USER_POOL_ID` /
      `COGNITO_USER_POOL_CLIENT_ID`). JWT `sub` becomes the DynamoDB `workspaceId`
      (`EXTRACK_DEV_WORKSPACE_ID_FROM_JWT=1`).
- [ ] **Admin/marketing routes** hit further real dev-account services when exercised
      (CloudWatch, CloudFormation, Cognito IdP, SQS) — same credential chain.

## What is intentionally OFF locally

- [ ] **Email** — every sender factory guards on `EMAIL_FROM`; leaving it unset disables the
      email service by design. Cognito custom email sender off via
      `EXTRACK_ENABLE_CUSTOM_EMAIL_SENDER=0`.
- [ ] **Scheduled jobs** — the `scheduled*.ts` cron Lambdas are separate exports wired only to
      EventBridge in AWS; the dev server imports only the HTTP handler, so no crons fire locally.
- [ ] **Secrets Manager** — no-op without the ARN (above).
- [ ] **Razorpay webhook HMAC** — `EXTRACK_RAZORPAY_WEBHOOK_SKIP_VERIFY=1` exists for local
      webhook testing only; never set in dev/prod deploys (enforced by the deploy-secret
      requirements list).

## New-machine startup sequence

- [ ] 1. Configure AWS named profile: `aws configure --profile extrack-dev` (or SSO). Everything
      AWS-touching assumes `extrack-dev` (dev) / `extrack-prod` (deploys only).
- [ ] 2. `cp .env.local.example .env.local`, then convert it to the real-AWS variant:
      **delete/leave-unset `DYNAMODB_ENDPOINT`**, add `AWS_PROFILE=extrack-dev`, replace
      `extrack-local-*` table names with the real `ExtrackDatabaseDev-*` physical names (from CFN
      outputs or the DynamoDB console), fill the real dev Cognito ids, `PORT=3001`,
      `AWS_REGION=ap-south-1`, `NEXT_PUBLIC_API_URL=http://127.0.0.1:3001`.
- [ ] 3. `yarn install` (yarn 1, frozen lockfile in CI).
- [ ] 4. `yarn dev` → env fan-out + three dev servers. Log in through real dev Cognito; data
      reads/writes hit real dev DynamoDB.
- [ ] No Docker required. `yarn docker:up` / `yarn db:local:all` belong solely to the skipped
      emulator path.

## The skipped path (know it exists, don't use it)

- [ ] `docker-compose.yml` = one service, `amazon/dynamodb-local` on `:8000`, **in-memory** (data
      wiped on stop). `packages/database` `db:local:create/seed/all/wipe` **force**
      `DYNAMODB_ENDPOINT=http://localhost:8000` if unset — they can never touch AWS, safe but
      irrelevant to the real-AWS workflow.
- [ ] README documents this emulator path as the default local story; the real-AWS pattern is
      emergent from `.env.local` and documented only here.

## Gotchas (verified)

- [ ] **Template-vs-reality divergence** is the #1 onboarding trap: `.env.local.example` = emulator
      path; team's real `.env.local` = AWS path. Until the template grows a commented "real-AWS
      variant" block, the hand-edit in step 2 is mandatory.
- [ ] **Shared dev data** — everyone on `extrack-dev` shares the same dev tables and user pool;
      destructive experiments belong in the emulator path or a personal workspace.
- [ ] **Naming drift** — README (and a comment in `apps/web/next.config.mjs`) still say
      `apps/dev-tools` / `yarn dev:dev-tools`; the directory is `apps/ops`, script is
      `yarn dev:ops`. CHANGELOG also references a `packages/extrack-mcp` that no longer exists.
- [ ] **CSV seed root scripts are dead** (`reseed:csv`, `db:local:seed:csv*`,
      `db:sanitize:transactions-csv` → missing `@repo/database` scripts) — see
      [root-scripts-organization.md](root-scripts-organization.md).
- [ ] `@aws-sdk/client-s3` is declared in `apps/api` deps but unused in source — local dev touches
      no S3.
