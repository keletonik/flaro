/**
 * Agent eval runner.
 *
 * Spawns an in-process agent loop for each EvalCase, feeds the prompt,
 * waits for the turn to complete, runs the assert, prints a ✓ / ✗ line
 * per case and exits with status 1 if any case failed.
 *
 * Deliberately minimal — no jest, no vitest — because running this
 * end-to-end with live DB + live Anthropic calls is expensive and we
 * want the loop tight enough to run on every PR without slowing CI to
 * a crawl.
 *
 * Usage:
 *   DATABASE_URL=... pnpm --filter @workspace/api-server run agent-eval
 */

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — pg ships no types in this workspace
import pg from "pg";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import { AGENT_TOOLS } from "../lib/chat-tools";
import { executeAgentTool } from "../lib/chat-tool-exec";
import type { EvalCase, EvalResult, PgLikePool } from "./types";
import { cases as wipCases } from "./wip.eval";

const { Pool } = pg;

const ALL_CASES: EvalCase[] = [
  ...wipCases,
];

async function runOne(pool: PgLikePool, c: EvalCase): Promise<EvalResult> {
  const started = Date.now();
  if (c.skip) {
    return { name: c.name, ok: true, durationMs: 0 };
  }
  try {
    if (c.setup) await c.setup(pool);
    const messages: any[] = [];
    if (c.history?.length) {
      for (const h of c.history) messages.push({ role: h.role, content: h.content });
    }
    messages.push({ role: "user", content: c.prompt });

    const timeoutMs = c.timeoutMs ?? 60000;
    const deadline = Date.now() + timeoutMs;

    let iteration = 0;
    while (iteration < 8) {
      if (Date.now() > deadline) throw new Error(`timeout after ${timeoutMs}ms`);
      iteration++;
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 4096,
        system: `You are AIDE running in eval mode. The user is on the "${c.section}" section. Use the tools.`,
        tools: AGENT_TOOLS as any,
        messages,
      });
      const toolUses = response.content.filter((b: any) => b.type === "tool_use");
      if (toolUses.length === 0) break;
      messages.push({ role: "assistant", content: response.content });
      const toolResults: any[] = [];
      for (const tu of toolUses as any[]) {
        try {
          const { result } = await executeAgentTool(tu.name, tu.input ?? {});
          toolResults.push({ type: "tool_result", tool_use_id: tu.id, content: JSON.stringify(result) });
        } catch (err) {
          toolResults.push({
            type: "tool_result",
            tool_use_id: tu.id,
            content: `Error: ${err instanceof Error ? err.message : String(err)}`,
            is_error: true,
          });
        }
      }
      messages.push({ role: "user", content: toolResults });
      if (response.stop_reason === "end_turn") break;
    }

    await c.assert(pool);
    if (c.teardown) await c.teardown(pool);
    return { name: c.name, ok: true, durationMs: Date.now() - started };
  } catch (err) {
    if (c.teardown) {
      try { await c.teardown(pool); } catch { /* ignore */ }
    }
    return {
      name: c.name,
      ok: false,
      durationMs: Date.now() - started,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL not set — cannot run evals");
    process.exit(1);
  }
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const results: EvalResult[] = [];

  console.log(`\n🤖 agent-evals — ${ALL_CASES.length} cases\n`);
  for (const c of ALL_CASES) {
    const r = await runOne(pool, c);
    results.push(r);
    const mark = r.ok ? "✓" : "✗";
    const color = r.ok ? "\x1b[32m" : "\x1b[31m";
    console.log(`  ${color}${mark}\x1b[0m  ${r.name} ${r.durationMs > 0 ? `(${r.durationMs}ms)` : "[skipped]"}`);
    if (!r.ok) console.log(`      └─ ${r.error}`);
  }

  await pool.end();

  const failed = results.filter(r => !r.ok).length;
  const total = results.length;
  console.log(`\n${failed === 0 ? "\x1b[32m" : "\x1b[31m"}${total - failed}/${total} passed\x1b[0m\n`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("eval runner crashed:", err);
  process.exit(1);
});
