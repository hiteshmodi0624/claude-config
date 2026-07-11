# Root-Run Scripts Organization Checklist

Source pattern: Extrack/FinanceTracker — a yarn@1 workspaces + turbo monorepo (`apps/*`,
`packages/*`, `infrastructure`) where **the repo root is the single entry point for everything**:
dev servers, builds, tests, e2e, env syncing, CDK deploys, CDN invalidation, DB seeding. Nobody
`cd`s into a workspace to run anything; every documented workflow is a root `package.json` script.
Verified against the actual scripts, not assumed.

## The pieces

| Path                                        | Role                                                                                                                                                    |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `package.json` (root)                       | The command surface. ~50 scripts, all namespaced `verb:qualifier:env` (`cdk:deploy:dev:stacks`, `integration:http`). `packageManager: yarn@1.22.22`, `engines.node >=20`. |
| `turbo.json`                                | Deliberately tiny pipeline — 4 tasks only: `build` (deps `^build`, outputs `dist/**`, `.next/**` minus cache), `lint` (bare), `test` (deps `^build`), `dev` (deps `^build`, `cache:false`, `persistent:true`). No `globalEnv`/`globalDependencies`. |
| `scripts/`                                  | Cross-workspace orchestration: `env-sync.mjs`, `deploy-dev.sh`/`deploy-prod.sh`, `verify-pre-deploy.sh`, `e2e.mjs`, `build-web-open-next.sh`/`build-ops-open-next.sh`, `invalidate-extrack-web-cdn.sh`, `docker-up.sh`/`docker-down.sh`, one-off data scripts (`backfill-*.mjs`, `indexnow-ping.mjs`) with co-located `*.test.mjs` run by `node --test scripts/`. |
| `infrastructure/scripts/`                   | AWS plumbing wrappers used by every `cdk:*` script: `with-aws-profile.sh <profile> <cmd…>` (sets `AWS_PROFILE` only if unset AND no `AWS_ACCESS_KEY_ID` — so CI OIDC creds win) and `cdk-with-aws-env.sh` (validates profile via `sts get-caller-identity`, appends `--profile` + `-c` CDK context from `EXTRACK_PUBLIC_*`). |
| `apps/*/package.json`, `packages/*/package.json` | Uniform per-workspace script contract: `build` / `lint` / `test` (+ `dev` only in web/api/ops). Root reaches them via turbo (fan-out) or `yarn workspace <name> <script>` (targeted). |

## Conventions (the rules that make root-run work)

- [ ] **One package manager, pinned.** `packageManager: "yarn@1.22.22"`; deploy/verify scripts use
      `yarn install --frozen-lockfile`. Never npm, never hand-edit lock files. (`npx` appears only
      as a binary runner — `npx turbo`, `npx open-next` — never for dependency management.)
- [ ] **Two delegation mechanisms, chosen by shape of the task:**
  - **turbo fan-out** for uniform tasks every workspace implements: `build`, `lint`, `test`, `dev`
    (`npx turbo run <task>`, optionally `--filter=web --filter=api`).
  - **`yarn workspace <name> <script>`** for targeted one-workspace commands: `dev:ops`,
    `integration*` → `integration-tests`, `db:local:*` → `@repo/database`, all `cdk:*` →
    `@extrack/infrastructure`, `check:deploy-secrets:*` → `api`.
  - Anything crossing workspaces or touching AWS is a shell/node script in `scripts/`, invoked as
    `bash scripts/x.sh` / `node scripts/x.mjs` from a root script.
- [ ] **Colon-namespaced script names, environment last:** `cdk:synth:dev`, `cdk:deploy:prod:stacks`,
      `cdk:invalidate-web:prod`, `env:sync:local`. Bare name = dev default (`cdk:synth` →
      `cdk:synth:dev`). Grep-friendly and self-documenting.
- [ ] **Env sync is a prefix step, not a separate ritual.** `dev` = `yarn env:sync:local && npx turbo
      run dev`; `deploy:dev` = `yarn env:sync:dev && bash scripts/deploy-dev.sh`. One gitignored
      root file per environment (`.env.local` / `.env.dev` / `.env.prod`, templates in
      `.env.*.example`) fans out to per-package env files via `scripts/env-sync.mjs`, each stamped
      "Generated — do not edit by hand". Keys are routed by prefix (`NEXT_PUBLIC_*`/`E2E_*` → web,
      `DEV_TOOLS_*` → ops, rest → api; `EXTRACK_*` → infrastructure CDK env).
- [ ] **`predev` hooks build upstream deps before a dev server starts** — web's `predev` runs
      `turbo run build --filter=web^...`, api's builds `@repo/database` + runs a local-env preflight
      (`check-local-dev-env`), ops's builds `@repo/app-shared`. Dev never starts against stale dist.
- [ ] **Every workspace exposes the same test contract.** `test` = `tsx --test` over an **explicit
      file list** in that package's `package.json` — a `.test.ts` not registered there never runs.
      Workspaces with nothing to test ship a no-op `test` (`node -e "process.exit(0)"`) rather than
      breaking turbo fan-out.
- [ ] **Deterministic build escape hatch.** `build:deterministic` = `--concurrency=1` (avoids
      intermittent Next `MODULE_NOT_FOUND` under parallel builds); `build:clean` adds `--no-cache`.
      Deploy pipelines use the deterministic variant, not plain `build`.
- [ ] **AWS profile discipline is centralized in wrappers, not repeated per script.** Named profiles
      `extrack-dev`/`extrack-prod`; every AWS-touching script goes through `with-aws-profile.sh`,
      which yields to injected CI credentials automatically. Default region `ap-south-1`; CloudFront
      invalidation forced to `us-east-1` (control-plane requirement).
- [ ] **Git hooks installed via `prepare: husky`:** `pre-commit` → `lint-staged` (eslint --fix
      --max-warnings 0 + prettier on staged), `commit-msg` → commitlint conventional (body line
      length rule disabled).

## Script families (quick reference)

| Family      | Root scripts                                                                                   | What actually runs                                                                                                     |
| ----------- | ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Dev         | `dev`, `dev:web-api`, `dev:ops`                                                                | env:sync:local, then turbo `dev`: web `next dev :3000`, api `tsx watch src/dev-server.ts` (Express wrapping the Lambda handler, `:3001`), ops `next dev :3010`. `dev:web-api` filters ops out (no env sync). |
| Build/QA    | `build`, `build:deterministic`, `build:clean`, `lint`, `test`, `test:all`, `test:scripts`, `format` | turbo fan-out; `test:all` = `scripts/run-tests.sh` → `yarn test`; `test:scripts` = `node --test scripts/`.               |
| Integration | `integration`, `integration:http`, `integration:e2e`, `integration:demo`, `integration:headed` | `integration-tests` workspace `run-all.mjs`: HTTP suite (`tsx --test --test-concurrency=1`) + Playwright vs deployed dev env; **skips silently (exit 0) without `E2E_SMOKE_EMAIL`/`E2E_SMOKE_PASSWORD`** (`REQUIRE_INTEGRATION_TESTS=1` to fail instead). |
| E2E         | `e2e`, `e2e:phased`, `e2e:all`, `e2e:serial`                                                   | `scripts/e2e.mjs` → Playwright in `apps/integration-tests`. Default `--phased`: fast project parallel (4 workers), heavy project serial. Parses its own flags because yarn 1 forwards args unreliably. |
| Verify gate | `verify:pre-deploy`                                                                             | `scripts/verify-pre-deploy.sh`: install --frozen-lockfile → lint → test → build:deterministic → web Playwright e2e (skippable via `VERIFY_SKIP_E2E=1`) → optional `cdk:synth` (`VERIFY_CDK_SYNTH=1`). Fail-closed. |
| Deploy      | `deploy:dev`, `deploy:prod`                                                                     | Full pipeline (see below).                                                                                              |
| CDK         | `cdk:synth[:dev\|:prod]`, `cdk:synth:dns:*`, `cdk:deploy:dev[:stacks]`, `cdk:deploy:prod[:stacks]`, `cdk:deploy:public-dns:*`, `cdk:invalidate-web:*`, `cdk:invalidate-ops:*` | Delegated to `@extrack/infrastructure` scripts through the profile wrappers. `:stacks` variant = deploy + CDN invalidations WITHOUT rebuilding web. Stack subset via `EXTRACK_CDK_STACKS` (default `--all`). |
| AWS builds  | `build:web:aws`, `build:ops:aws`                                                                | OpenNext bundles: source `infrastructure/.env.cdk.<env>.local`, pull `NEXT_PUBLIC_*` (API URL, Cognito ids, site URL) from live CloudFormation outputs, `next build` (retry ×3 cleaning `.next`), `npx open-next build`. |
| Secrets     | `check:deploy-secrets:dev/:prod`                                                                | api workspace `check-aws-deploy-secrets.ts` — validates the AWS Secrets Manager JSON before stack deploy (auto-run inside `cdk:deploy:*:stacks`). |
| DB (local)  | `db:local:all/create/seed/wipe`, `docker:up/down`                                               | `@repo/database` `local-dynamodb.ts` against dockerized DynamoDB Local (`docker-compose.yml`, sole service, `:8000`, in-memory). **Optional path — see local-dev checklist; team dev runs against real AWS dev tables instead.** |

## The deploy pipeline (what `deploy:dev` / `deploy:prod` actually do)

- [ ] Ordered, idempotent, one command from root:
  1. `yarn env:sync:dev|prod` (root env file → CDK env files)
  2. `yarn install --frozen-lockfile`
  3. `yarn build:deterministic` (all workspaces, serial)
  4. `yarn build:web:aws` + `yarn build:ops:aws` (OpenNext; skippable via
     `EXTRACK_SKIP_WEB_STACK=1` / `EXTRACK_SKIP_OPS_STACK=1`)
  5. `yarn cdk:synth[:prod]`
  6. `yarn cdk:deploy:dev|prod:stacks` — secrets preflight → `cdk deploy --require-approval never
     --all` → CloudFront invalidation for web + ops stacks
- [ ] Profile/env exports live in the deploy script, not the operator's shell (`AWS_PROFILE`,
      `EXTRACK_PUBLIC_*` fallbacks, prod stack names `ExtrackApiProd`/`ExtrackAuthProd`/
      `ExtrackWebProd`/`ExtrackOpsProd`).
- [ ] First prod deploy may need a second run — `NEXT_PUBLIC_API_URL`/Cognito ids only exist as
      CloudFormation outputs after the stacks exist, and the web build bakes them in.
- [ ] `yarn verify:pre-deploy` is the documented gate before any deploy (CLAUDE.md rule).

## Gotchas (verified, keep honest)

- [ ] **Root `yarn dev` starts ops too** (turbo `dev` is unfiltered → web :3000 + api :3001 +
      ops :3010). Use `dev:web-api` to exclude ops.
- [ ] **Four root scripts are dead** — `db:local:seed:csv`, `db:local:seed:csv:accounts-tx`,
      `reseed:csv`, `db:sanitize:transactions-csv` delegate to `@repo/database` scripts that no
      longer exist (root package.json lines ~69–72). Fail on invocation; fix or remove.
- [ ] **`apps/ops` and `apps/remote-mcp` have no `test` script** — silently excluded from
      `turbo run test` and thus from `verify:pre-deploy`. Know this when claiming "all tests green".
- [ ] **Integration tests exit 0 when unconfigured** — a green `yarn integration` proves nothing
      unless `E2E_SMOKE_EMAIL` was set (or `REQUIRE_INTEGRATION_TESTS=1`).
- [ ] When porting this pattern: keep turbo.json minimal (4 tasks), push all environment/AWS
      complexity into `scripts/` + wrapper scripts, and never let a workspace README document a
      command that isn't reachable from a root script.
