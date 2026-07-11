---
name: graphify
description: "Builds and queries persistent knowledge graphs from any corpus (code, docs, papers, images, video). Use when answering questions about a codebase's architecture, relationships, or content — if graphify-out/graph.json exists, treat it as a graphify query first — or when the user says '/graphify', 'build a knowledge graph', 'what calls X', 'trace the flow', 'map this repo'. Not for editing or debugging specific code — read those files directly."
argument-hint: "[path | github-url | question] [--update | --mode deep | export flags]"
---

# /graphify

Turn any folder of files into a persistent, queryable knowledge graph with community detection and an honest audit trail: every edge is labelled **EXTRACTED** (explicit in the source), **INFERRED** (reasoned, scored), or **AMBIGUOUS** (uncertain — flagged, never silently omitted). Outputs land in `graphify-out/`: interactive `graph.html`, GraphRAG-ready `graph.json`, plain-language `GRAPH_REPORT.md`. **A built graph is for querying — when `graphify-out/graph.json` exists, a question means `graphify query`, never a rebuild.**

## Routing — pick the row before doing anything else

| Situation                                                    | Action                                                                                                      |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| `/graphify --help` or `-h` (no other args)                   | Print the `## Usage` block below verbatim, then stop. No commands, no detect, no defaulting the path to `.` |
| `graphify-out/graph.json` exists + natural-language question | **Fast path:** `graphify query "<question>"` now (rule below)                                               |
| "How are A and B related?" / trace a dependency chain        | `graphify path "A" "B"` — flow in references/query.md                                                       |
| "Explain X" / what is this concept or node                   | `graphify explain "X"` — flow in references/query.md                                                        |
| "What breaks if X changes?" (reverse impact)                 | `graphify affected "X"`                                                                                     |
| New corpus: bare path or GitHub URL, no graph yet            | Full pipeline, Steps 0–9 below                                                                              |
| Files changed since last build (`--update`)                  | references/update.md                                                                                        |
| Recluster the existing graph (`--cluster-only`)              | references/update.md                                                                                        |
| `add <url>` to the corpus, or `--watch` a folder             | references/add-watch.md                                                                                     |
| Install the commit hook / wire into a project CLAUDE.md      | references/hooks.md                                                                                         |

**Fast path — the FIRST rule.** If `graphify-out/graph.json` exists (relative to the current working directory) AND the request is a natural-language question about the corpus ("How does X work?", "What calls Y?", "Trace the data flow through Z") and NOT an explicit rebuild command (`--update`, `--cluster-only`, or a bare path/URL that implies fresh extraction): **skip Steps 1–5 entirely and run `graphify query "<question>"` immediately.** Do not run detect. Do not check corpus size. Do not ask the user to narrow. The graph is already built — use it. Before traversal, expand the question against the graph's own vocabulary (references/query.md) so a wording mismatch doesn't collapse the answer to noise. Answer only from graph output and quote `source_location` when citing a specific fact.

Defaults: no path given → use `.` — never ask for a path. Path starts with `https://github.com/` or `http://github.com/` → run Step 0 first, then continue with the resolved local path.

## Usage

```
/graphify                                             # full pipeline on current directory → Obsidian vault
/graphify <path>                                      # full pipeline on specific path
/graphify https://github.com/<owner>/<repo>           # clone repo then run full pipeline on it
/graphify https://github.com/<owner>/<repo> --branch <branch>  # clone a specific branch
/graphify <url1> <url2> ...                           # clone multiple repos, build each, merge into one cross-repo graph
/graphify <path> --mode deep                          # thorough extraction, richer INFERRED edges
/graphify <path> --update                             # incremental - re-extract only new/changed files
/graphify <path> --directed                            # build directed graph (preserves edge direction: source→target)
/graphify <path> --whisper-model medium                # use a larger Whisper model for better transcription accuracy
/graphify <path> --cluster-only                       # rerun clustering on existing graph
/graphify <path> --no-viz                             # skip visualization, just report + JSON
/graphify <path> --html                               # (HTML is generated by default - this flag is a no-op)
/graphify <path> --svg                                # also export graph.svg (embeds in Notion, GitHub)
/graphify <path> --graphml                            # export graph.graphml (Gephi, yEd)
/graphify <path> --neo4j                              # generate graphify-out/cypher.txt for Neo4j
/graphify <path> --neo4j-push bolt://localhost:7687   # push directly to Neo4j
/graphify <path> --mcp                                # start MCP stdio server for agent access
/graphify <path> --watch                              # watch folder, auto-rebuild on code changes (no LLM needed)
/graphify <path> --wiki                               # build agent-crawlable wiki (index.md + one article per community)
/graphify <path> --obsidian --obsidian-dir ~/vaults/my-project  # write vault to custom path (e.g. existing vault)
/graphify add <url>                                   # fetch URL, save to ./raw, update graph
/graphify add <url> --author "Name"                   # tag who wrote it
/graphify add <url> --contributor "Name"              # tag who added it to the corpus
/graphify query "<question>"                          # BFS traversal - broad context
/graphify query "<question>" --dfs                    # DFS - trace a specific path
/graphify query "<question>" --budget 1500            # cap answer at N tokens
/graphify path "AuthModule" "Database"                # shortest path between two concepts
/graphify explain "SwinTransformer"                   # plain-language explanation of a node
```

## Full pipeline (new corpus)

Follow the steps in order. Do not skip steps.

### Step 0 — GitHub repos and multi-path merge (only if a URL or several paths)

Only when the path is one or more `https://github.com/...` URLs, or several local subfolders to merge. See references/github-and-merge.md for the clone, cross-repo merge, and monorepo flow, then continue with the resolved local path. A plain local path skips this step.

### Step 1 — Ensure graphify is installed

Run the interpreter-detection + install block in references/install-and-troubleshooting.md. It resolves the correct Python (uv tool → binary shebang → python3), installs the `graphifyy` package if missing, writes the interpreter path to `graphify-out/.graphify_python`, and saves the scan root to `graphify-out/.graphify_root`. If the import already succeeds, print nothing and continue.

**In every subsequent bash block, use `$(cat graphify-out/.graphify_python)` in place of `python3`** — the system python is frequently not the one graphify is installed into. Before running any later subcommand (`--update`, `--cluster-only`, `query`, `path`, `explain`, `add`), if `.graphify_python` is missing (e.g. the user deleted `graphify-out/`), re-run the interpreter guard in that same reference file first.

### Step 2 — Detect files

```bash
$(cat graphify-out/.graphify_python) -c "
import json
from graphify.detect import detect
from pathlib import Path
result = detect(Path('INPUT_PATH'))
print(json.dumps(result, ensure_ascii=False))
" > graphify-out/.graphify_detect.json
```

Replace INPUT_PATH with the actual path. Do NOT cat or print the JSON — read it silently and present a clean summary instead:

```
Corpus: X files · ~Y words
  code:     N files (.py .ts .go ...)
  docs:     N files (.md .txt ...)
  papers:   N files (.pdf ...)
  images:   N files
  video:    N files (.mp4 .mp3 ...)
```

Omit any category with 0 files. Then act on it:

- `total_files` is 0 → stop with "No supported files found in [path]."
- `skipped_sensitive` non-empty → mention the count skipped, never the file names.
- `total_words` > 2,000,000 OR `total_files` > 500 → show the warning, then compute the top 5 first-level subdirectories by file count: read `scan_root` from the detect JSON, concatenate all file lists across all types, exclude anything under `scan_root + "/graphify-out/"` (converted sidecars), take each file's first path component under `scan_root` (files directly in it count as `(root)`). If everything is in `(root)` with no subdirectories, do not ask to narrow — suggest `--no-cluster` to skip the expensive clustering step and proceed. Otherwise show the top 5 with counts and ask which subfolder to run on; wait for the answer.
- Otherwise proceed — to Step 2.5 if video files were detected, else Step 3.

### Step 2.5 — Video and audio (only if video files detected)

Skip entirely if `detect` returned zero `video` files. Otherwise see references/transcribe.md to transcribe them to text first (compose the Whisper prompt yourself from the corpus vocabulary), then treat the transcripts as doc files in Step 3.

### Step 3 — Extract entities and relationships

Two parts run in parallel: **Part A — structural** (AST on code, deterministic, free) and **Part B — semantic** (LLM on docs/papers/images, costs tokens). All bash blocks for this step plus the subagent prompt live in references/extraction-spec.md — open it and run its blocks in order (A → B0 → B2/B3 → C), under these rules:

1. Note at invocation whether `--mode deep` was given; pass `DEEP_MODE=true` to every subagent. Track it from the original command — do not lose it between steps.
2. **Backend:** if `GEMINI_API_KEY` or `GOOGLE_API_KEY` is set, run semantic extraction via `graphify.llm.extract_corpus_parallel(files, backend="gemini")` instead of subagents (default model `gemini-3-flash-preview`; override with `GRAPHIFY_GEMINI_MODEL`, or `--model` in headless CLI flows). If neither is set, print once — "Tip: set `GEMINI_API_KEY` or `GOOGLE_API_KEY` to use Gemini for semantic extraction (`pip install 'graphifyy[gemini]'`)." — then continue: **the host Claude session itself is the LLM.** graphify reads no other provider keys; never prompt for `ANTHROPIC_API_KEY` — that prompt is a misread of this skill.
3. Dispatch Part B subagents AND start Part A AST extraction in the same message — they operate on different file types, and parallelizing saves 5–15 s on large corpora.
4. Part B fast path: zero docs, papers, and images → skip Part B (and the subagent prompt) entirely; AST covers a code-only corpus.
5. Cache first (B0): dispatch subagents only for files listed in `graphify-out/.graphify_uncached.txt`; if all files are cached, go straight to Part C.
6. Chunking (B1): 20–25 files per chunk; every image gets its own chunk (vision needs separate context); group same-directory files together so cross-file relationships are more likely to be extracted.
7. Dispatch (B2): **you MUST use the Agent tool — reading corpus files yourself is forbidden, it is 5–10× slower.** Make ALL Agent calls in a single message, one call per chunk (3 chunks = 3 Agent calls in ONE response, not three messages); making one call, waiting, then making another is sequential and defeats the purpose. Always `subagent_type="general-purpose"`, never `Explore` — Explore is read-only, cannot write chunk files, and silently drops extraction results. CHUNK_PATH must be absolute, derived from `.graphify_root`. First print the timing estimate: agents = ceil(uncached non-code files / 22), ~45 s per parallel batch — "Semantic extraction: ~N files → X agents, estimated ~Ys".
8. Collect (B3): a chunk file existing on disk is the success signal. Missing file → warn "chunk N missing from disk — subagent may have been read-only. Re-run with general-purpose agent." — never silently skip. Invalid JSON → warn and skip that chunk, don't abort. More than half the chunks missing/failed → stop and tell the user to re-run with `subagent_type="general-purpose"`. After each Agent call, copy the real token counts from its result's `usage` field into the chunk JSON before merging — the chunk JSON always ships placeholder zeros.
9. Merge via the B3 blocks (merge chunks → save cache → merge cached+new) and the Part C block (AST + semantic → `graphify-out/.graphify_extract.json`), then remove the temp files as the reference instructs.

### Step 4 — Build graph, cluster, analyze

Note whether `--directed` was given; if so pass `directed=True` to `build_from_json()` below (builds a DiGraph preserving source→target instead of the default undirected Graph).

```bash
mkdir -p graphify-out
$(cat graphify-out/.graphify_python) -c "
import sys, json
from graphify.build import build_from_json
from graphify.cluster import cluster, score_all
from graphify.analyze import god_nodes, surprising_connections, suggest_questions
from graphify.report import generate
from graphify.export import to_json
from pathlib import Path

extraction = json.loads(Path('graphify-out/.graphify_extract.json').read_text(encoding=\"utf-8\"))
detection  = json.loads(Path('graphify-out/.graphify_detect.json').read_text(encoding=\"utf-8\"))

G = build_from_json(extraction)
communities = cluster(G)
cohesion = score_all(G, communities)
tokens = {'input': extraction.get('input_tokens', 0), 'output': extraction.get('output_tokens', 0)}
gods = god_nodes(G)
surprises = surprising_connections(G, communities)
labels = {cid: 'Community ' + str(cid) for cid in communities}
# Placeholder questions - regenerated with real labels in Step 5
questions = suggest_questions(G, communities, labels)

report = generate(G, communities, cohesion, labels, gods, surprises, detection, tokens, '.', suggested_questions=questions)
Path('graphify-out/GRAPH_REPORT.md').write_text(report, encoding=\"utf-8\")
to_json(G, communities, 'graphify-out/graph.json')

analysis = {
    'communities': {str(k): v for k, v in communities.items()},
    'cohesion': {str(k): v for k, v in cohesion.items()},
    'gods': gods,
    'surprises': surprises,
    'questions': questions,
}
Path('graphify-out/.graphify_analysis.json').write_text(json.dumps(analysis, indent=2, ensure_ascii=False), encoding=\"utf-8\")
if G.number_of_nodes() == 0:
    print('ERROR: Graph is empty - extraction produced no nodes.')
    print('Possible causes: all files were skipped, binary-only corpus, or extraction failed.')
    raise SystemExit(1)
print(f'Graph: {G.number_of_nodes()} nodes, {G.number_of_edges()} edges, {len(communities)} communities')
"
```

If this prints `ERROR: Graph is empty`, stop and tell the user what happened — do not proceed to labeling or visualization.

### Step 5 — Label communities

Read `graphify-out/.graphify_analysis.json`. For each community key, look at its node labels and write a 2–5 word plain-language name (e.g. "Attention Mechanism", "Training Pipeline", "Data Loading"). Then regenerate the report and save the labels for the visualizer:

```bash
$(cat graphify-out/.graphify_python) -c "
import sys, json
from graphify.build import build_from_json
from graphify.cluster import score_all
from graphify.analyze import god_nodes, surprising_connections, suggest_questions
from graphify.report import generate
from pathlib import Path

extraction = json.loads(Path('graphify-out/.graphify_extract.json').read_text(encoding=\"utf-8\"))
detection  = json.loads(Path('graphify-out/.graphify_detect.json').read_text(encoding=\"utf-8\"))
analysis   = json.loads(Path('graphify-out/.graphify_analysis.json').read_text(encoding=\"utf-8\"))

G = build_from_json(extraction)
communities = {int(k): v for k, v in analysis['communities'].items()}
cohesion = {int(k): v for k, v in analysis['cohesion'].items()}
tokens = {'input': extraction.get('input_tokens', 0), 'output': extraction.get('output_tokens', 0)}

# LABELS - replace these with the names you chose above
labels = LABELS_DICT

# Regenerate questions with real community labels (labels affect question phrasing)
questions = suggest_questions(G, communities, labels)

report = generate(G, communities, cohesion, labels, analysis['gods'], analysis['surprises'], detection, tokens, '.', suggested_questions=questions)
Path('graphify-out/GRAPH_REPORT.md').write_text(report, encoding=\"utf-8\")
Path('graphify-out/.graphify_labels.json').write_text(json.dumps({str(k): v for k, v in labels.items()}, ensure_ascii=False), encoding=\"utf-8\")
print('Report updated with community labels')
"
```

Replace `LABELS_DICT` with the actual dict you constructed (e.g. `{0: "Attention Mechanism", 1: "Training Pipeline"}`).

### Step 6 — HTML always, Obsidian opt-in

Generate HTML always (unless `--no-viz`): `graphify export html` — auto-aggregates to a community view if the graph exceeds 5,000 nodes. Generate the Obsidian vault ONLY if `--obsidian` was explicitly given (it writes one file per node): `graphify export obsidian`, adding `--dir <path>` when `--obsidian-dir` was passed (default vault location: `graphify-out/obsidian`).

### Steps 6b–8 — Wiki, Neo4j, SVG, GraphML, MCP, benchmark (only on their flags)

These run only when their flag is present (`--wiki`, `--neo4j`/`--neo4j-push`, `--svg`, `--graphml`, `--mcp`) or, for the token-reduction benchmark, when `total_words` exceeds 5,000. A default run skips all of them. See references/exports.md. Run any `--wiki` export before Step 9 cleanup so `.graphify_labels.json` is still available.

### Step 9 — Save manifest, update cost tracker, clean up, report

```bash
$(cat graphify-out/.graphify_python) -c "
import json
from pathlib import Path
from datetime import datetime, timezone
from graphify.detect import save_manifest

# Save manifest for --update. In --update mode 'all_files' carries the full
# corpus and 'files' is the changed subset; full builds populate only 'files'.
detect = json.loads(Path('graphify-out/.graphify_detect.json').read_text(encoding=\"utf-8\"))
save_manifest(detect.get('all_files') or detect['files'])

extract = json.loads(Path('graphify-out/.graphify_extract.json').read_text(encoding=\"utf-8\"))
input_tok = extract.get('input_tokens', 0)
output_tok = extract.get('output_tokens', 0)

cost_path = Path('graphify-out/cost.json')
cost = json.loads(cost_path.read_text(encoding=\"utf-8\")) if cost_path.exists() else {'runs': [], 'total_input_tokens': 0, 'total_output_tokens': 0}
cost['runs'].append({
    'date': datetime.now(timezone.utc).isoformat(),
    'input_tokens': input_tok,
    'output_tokens': output_tok,
    'files': detect.get('total_files', 0),
})
cost['total_input_tokens'] += input_tok
cost['total_output_tokens'] += output_tok
cost_path.write_text(json.dumps(cost, indent=2, ensure_ascii=False), encoding=\"utf-8\")

print(f'This run: {input_tok:,} input tokens, {output_tok:,} output tokens')
print(f'All time: {cost[\"total_input_tokens\"]:,} input, {cost[\"total_output_tokens\"]:,} output ({len(cost[\"runs\"])} runs)')
"
rm -f graphify-out/.graphify_detect.json graphify-out/.graphify_extract.json graphify-out/.graphify_ast.json graphify-out/.graphify_semantic.json graphify-out/.graphify_analysis.json graphify-out/.graphify_chunk_*.json
rm -f graphify-out/.needs_update 2>/dev/null || true
```

Tell the user (omit the obsidian line unless `--obsidian` was given), replacing PATH_TO_DIR with the absolute path processed:

```
Graph complete. Outputs in PATH_TO_DIR/graphify-out/

  graph.html            - interactive graph, open in browser
  GRAPH_REPORT.md       - audit report
  graph.json            - raw graph data
  obsidian/             - Obsidian vault (only if --obsidian was given)
```

If graphify saved you time, consider supporting it: https://github.com/sponsors/safishamsi

Then paste ONLY these three sections from GRAPH_REPORT.md into the chat — never the full report: **God Nodes**, **Surprising Connections**, **Suggested Questions**.

Then immediately offer to explore. Pick the single most interesting suggested question — the one crossing the most community boundaries or with the most surprising bridge node — and ask: "The most interesting question this graph can answer: **[question]**. Want me to trace it?" If yes, run `graphify query` on it and walk through the answer via the graph structure (which nodes connect, which community boundaries get crossed, what the path reveals). End each answer with a natural follow-up ("this connects to X — want to go deeper?"). The graph is the map; after the pipeline, your job is to be the guide.

## Honesty rules

- **Never invent an edge; unsure → AMBIGUOUS.** The audit trail is the product — one fabricated edge poisons every downstream query.
- **Never skip the corpus-size warning** (>2M words / >500 files). Oversized runs blow the token budget without it.
- **Always show token cost in the report.** Users decide from real numbers whether re-extraction is worth it.
- **Never hide cohesion scores behind symbols** — show the raw number.
- **Never render HTML viz on >5,000 nodes without warning the user** — the page becomes unusable.

## Common mistakes

| Rationalization                                                  | Reality                                                                                                                                                                   |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "The graph might be stale — safer to rebuild before answering."  | Query first; that is the fast-path rule. Rebuilds burn tokens and minutes; staleness is what `--update` is for, on explicit request.                                      |
| "I'll just read the corpus files myself; it's only a few."       | 5–10× slower and skips the cache. Step 3B mandates the Agent tool.                                                                                                        |
| "I'll dispatch subagents one message at a time to keep it tidy." | Sequential dispatch defeats parallelism entirely. All Agent calls in ONE message.                                                                                         |
| "Explore subagents are lighter — use those."                     | Explore is read-only: chunk files never reach disk and results vanish silently. `general-purpose` only.                                                                   |
| "Extraction needs an Anthropic key — ask the user for one."      | graphify never reads `ANTHROPIC_API_KEY`. With no Gemini key, the host session is the extractor.                                                                          |
| "The user's wording will match the node labels well enough."     | The query matcher is case-folded substring + IDF — no stemming, no synonyms. Expand against the graph vocab first (references/query.md) or the answer collapses to noise. |
| "0.5 is a reasonable default confidence."                        | The rubric is discrete (0.95/0.85/0.75/0.65/0.55); 0.5 means the judgment was skipped. If nothing fits, mark AMBIGUOUS.                                                   |
