# claude-config

Single source of truth for my portable `~/.claude` "brain" — skills, hooks, agents,
commands, global rules (`CLAUDE.md` / `WORKFLOW.md` / `RTK.md`) and settings.

One repo, installable anywhere: **my laptop**, a **fresh machine**, or a **cloud
co-work box** (via the environment's Setup script). Edit once, pull everywhere.

## What's inside

```
payload/                   config-only snapshot of ~/.claude
  skills/                  my authored skills
  hooks/                   caveman + engineering-principles + rtk-rewrite (pure node, no deps)
  agents/  commands/
  CLAUDE.md WORKFLOW.md RTK.md
  settings.template.json   paths tokenised __CLAUDE_HOME__ / __NODE__, rendered at install
install.sh                 the installer (see below)
install.test.sh            behavioural specs — `bash install.test.sh`
```

**Not included, by design:** downloaded plugins (re-fetched from the marketplaces
declared in `settings.template.json`), and all machine state — logs, caches,
sessions, projects, tokens. Config only, safe to be public.

## Install

```
./install.sh [--global | --repo <path>] [--copy | --link] [--full | --lean]
```

| Flag            | Meaning                                                                 |
| --------------- | ----------------------------------------------------------------------- |
| `--global`      | install into `~/.claude` (default) — laptops & cloud boxes              |
| `--repo <path>` | install into `<path>/.claude` — repo-local, read by cloud automatically |
| `--copy`        | copy files (default) — ephemeral cloud boxes / fresh machines           |
| `--link`        | symlink dirs back to this repo — my dev laptop, so edits sync to git    |
| `--full`        | everything incl. hooks, rules, settings, plugins (default)              |
| `--lean`        | skills + agents + commands only (no behaviour-changing config)          |

`CLAUDE_HOME` env overrides the target config dir.

### My laptop (edit-in-place)

```
git clone https://github.com/hiteshmodi0624/claude-config.git
cd claude-config
./install.sh --global --link --full
```

Now `~/.claude/skills` → this repo. Edit a skill, `git commit`, and every other
environment picks it up on next pull.

### Fresh machine

```
git clone https://github.com/hiteshmodi0624/claude-config.git && \
  ./claude-config/install.sh --global --copy --full
```

### Cloud co-work (claude.ai/code)

Paste into the environment's **Setup script** field (runs as root, before Claude
launches):

```bash
command -v node >/dev/null 2>&1 || { curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && apt-get install -y nodejs; }
rm -rf /tmp/claude-config
git clone --depth 1 https://github.com/hiteshmodi0624/claude-config.git /tmp/claude-config
/tmp/claude-config/install.sh --global --copy --full
```

Every session in that environment then boots with my full setup, for any repo.

> **Caveat (validate on first run):** cloud co-work does not _sync_ a laptop's
> `~/.claude`, but the Setup script populates `~/.claude` on the cloud box before
> Claude starts, and the same binary reads it. If a future cloud image ignores the
> global dir, fall back to `--repo "$PWD"` to seed the repo-local `.claude/`, which
> is the documented-guaranteed path.

## Update the source of truth

Re-snapshot the laptop's live config into `payload/` (config-only), then commit:

```
./sync-from-home.sh   # re-pulls skills/hooks/agents/rules; edit settings.template.json by hand
```

On a `--link` laptop you can skip it — `payload/` and `~/.claude` are the same files.
