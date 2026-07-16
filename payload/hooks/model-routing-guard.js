#!/usr/bin/env node
/**
 * model-routing-guard.js — PreToolUse hook enforcing model/effort routing policy.
 *
 * Policy (see ~/.claude/WORKFLOW.md "Model & effort routing"):
 *   - haiku  = mechanical work (scans, formatting, lookups)
 *   - sonnet = DEFAULT for all implementation / research subagents (effort medium)
 *   - opus   = planning + review/verification ONLY, or an explicit escalation
 *     ("[ESCALATED: reason]") after a cheaper attempt failed.
 *   - Omitting `model` inherits the session model (most expensive tier) — only
 *     allowed for planning/review roles or agent types with their own model
 *     frontmatter.
 *
 * Exit 0 = allow. Exit 2 = block; stderr is fed back to the model so it can
 * re-issue the call with compliant routing.
 */

const EXPENSIVE = /^(opus|fable)/i;
// Roles allowed on the expensive tier (or to inherit the session model).
const JUSTIFIED =
  /\b(review|reviewer|plan|planning|planner|verif|audit|judge|adversar|critique|architect|escalat)/i;
// Agent types whose definition carries its own model frontmatter — model may be omitted.
const SELF_MODELED_TYPES = new Set([
  "worktree-builder",
  "branch-reviewer",
  "statusline-setup",
  "claude-code-guide",
]);
// Generic types that inherit the session model when `model` is omitted.
const GENERIC_TYPES = new Set(["", "general-purpose", "claude", "Explore", "fork"]);

function deny(msg) {
  process.stderr.write(msg);
  process.exit(2);
}

function checkAgent(input) {
  const model = String(input.model || "").toLowerCase();
  const text = `${input.prompt || ""} ${input.description || ""}`;
  const type = input.subagent_type || "";
  const justified = JUSTIFIED.test(text) || type === "Plan" || type === "branch-reviewer";

  if (EXPENSIVE.test(model) && !justified) {
    deny(
      "MODEL ROUTING POLICY (auto-enforced): opus/fable tier is reserved for planning, " +
        "review/verification, or explicitly escalated work. Re-issue with model 'sonnet' " +
        "(default implementation/research) or 'haiku' (mechanical). To escalate a task that " +
        "already failed on sonnet, include '[ESCALATED: <reason>]' in the prompt.",
    );
  }

  if (!model && !justified && !SELF_MODELED_TYPES.has(type) && GENERIC_TYPES.has(type)) {
    deny(
      "MODEL ROUTING POLICY (auto-enforced): no `model` set — this spawn would inherit the " +
        "session model (most expensive tier). Re-issue with an explicit model: 'sonnet' " +
        "(default implementation/research, effort medium), 'haiku' (mechanical), or 'opus' " +
        "(planning/review/escalated only).",
    );
  }
}

function checkWorkflow(input) {
  let script = input.script || "";
  if (!script && input.scriptPath) {
    try {
      script = require("fs").readFileSync(input.scriptPath, "utf8");
    } catch {
      return; // unreadable → let the tool surface its own error
    }
  }
  if (!/\bagent\s*\(/.test(script)) return;

  if (!/\bmodel\s*:/.test(script)) {
    deny(
      "MODEL ROUTING POLICY (auto-enforced): this Workflow script spawns agent() calls with no " +
        "model routing — every agent inherits the session model (most expensive tier). Add " +
        "model per stage: 'sonnet' + effort 'medium' for build/mechanical stages, 'haiku' for " +
        "trivial scans, 'opus' + effort 'high' ONLY for review/verify/plan stages.",
    );
  }
  if (/(["'`])fable\1/i.test(script)) {
    deny(
      "MODEL ROUTING POLICY (auto-enforced): do not route workflow agents to the 'fable' tier. " +
        "Use 'sonnet' for build stages and 'opus' for review/verify/plan stages.",
    );
  }
}

let raw = "";
process.stdin.on("data", (d) => (raw += d));
process.stdin.on("end", () => {
  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    process.exit(0); // malformed input → never block
  }
  const tool = payload.tool_name || "";
  const input = payload.tool_input || {};
  if (tool === "Task" || tool === "Agent") checkAgent(input);
  else if (tool === "Workflow") checkWorkflow(input);
  process.exit(0);
});
