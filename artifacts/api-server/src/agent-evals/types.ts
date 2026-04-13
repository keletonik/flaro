/**
 * Shared types for the agent eval harness.
 *
 * Kept deliberately small so new eval files stay readable. See
 * README.md in this directory for the execution contract.
 */

// Loose pool type so we don't need @types/pg at type-check time. Any
// pg-compatible client with a .query() method that returns { rows }
// will satisfy it.
export interface PgLikePool {
  query: (sql: string, params?: any[]) => Promise<{ rows: any[] }>;
  end?: () => Promise<void>;
}

export interface EvalCase {
  /** Human-readable name, shown in the runner's output. */
  name: string;
  /**
   * Section slug to pass to /chat/agent. Matches the section strings
   * AIDEAssistant derives from the route (dashboard, wip, estimation,
   * tasks, fip, ...). The agent uses it to bias its tool selection.
   */
  section: string;
  /** The user message to send to the agent. */
  prompt: string;
  /**
   * Optional prior messages to seed the conversation with. Useful for
   * testing multi-turn flows (e.g. "confirm yes" after a destructive
   * prompt).
   */
  history?: { role: "user" | "assistant"; content: string }[];
  /**
   * Asserts the DB reached the expected state. Receives a pg Pool for
   * direct SELECTs. Throw to fail the case.
   */
  assert: (pool: PgLikePool) => Promise<void>;
  /**
   * Optional setup — runs before the prompt is sent. Use to insert
   * fixture data the prompt depends on.
   */
  setup?: (pool: PgLikePool) => Promise<void>;
  /**
   * Optional teardown — runs after the assert regardless of outcome.
   * Use to clean up fixture data the case created.
   */
  teardown?: (pool: PgLikePool) => Promise<void>;
  /** Max seconds the agent loop is allowed to run. Defaults to 60. */
  timeoutMs?: number;
  /** Skip this case (useful for WIP cases). */
  skip?: boolean;
}

export interface EvalResult {
  name: string;
  ok: boolean;
  durationMs: number;
  error?: string;
}
