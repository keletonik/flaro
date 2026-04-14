# Agent behavioural evals

Scripted prompts the agent must pass. Each file exports an array of
`EvalCase` records. The runner (`run.ts`) spawns a local agent loop,
feeds each prompt, then runs the case's `assert` function against the
resulting DB state.

## Running
```
pnpm --filter @workspace/api-server run agent-eval
```
(script wired in `package.json`).

## Writing a case
```ts
export const cases: EvalCase[] = [
  {
    name: "create a high-priority todo",
    section: "tasks",
    prompt: "Add a todo to chase Pertronic on Monday, High priority",
    assert: async (db) => {
      const rows = await db.query(
        `SELECT * FROM todos WHERE text ILIKE '%Pertronic%' ORDER BY created_at DESC LIMIT 1`
      );
      if (rows.rows.length === 0) throw new Error("todo not created");
      if (rows.rows[0].priority !== "High") throw new Error("wrong priority");
    },
  },
];
```

Every commit that touches `routes/chat-agent.ts`, `lib/chat-tools.ts`
or `lib/chat-tool-exec.ts` should run `agent-eval` before merge.
