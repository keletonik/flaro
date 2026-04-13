/**
 * POST /api/chat/agent — agentic replacement for /chat/contextual.
 *
 * Wire protocol (SSE):
 *   data: {"type":"text","content":"..."}            incremental assistant text
 *   data: {"type":"tool_start","name":"db_search",...} Claude is about to call a tool
 *   data: {"type":"tool_result","name":"...","ok":true}  tool finished (result not streamed)
 *   data: {"type":"ui_action","action":{"type":"refresh"}} tell the frontend to do something
 *   data: {"type":"error","error":"..."}             unrecoverable failure
 *   data: {"type":"done"}                            Claude has stopped turning
 *
 * The frontend AnalyticsPanel consumes these events and shows the running
 * tool chain inline in the chat, then dispatches a window event so every
 * open view refreshes after writes.
 *
 * Agent loop is bounded at 8 iterations to prevent runaway tool chains;
 * 8 is enough for any realistic workflow ("search, confirm, update,
 * refresh") and keeps cost predictable.
 */

import { Router } from "express";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import { AGENT_TOOLS } from "../lib/chat-tools";
import { executeAgentTool } from "../lib/chat-tool-exec";

const router = Router();

const MAX_ITERATIONS = 8;

const AGENT_SYSTEM_PROMPT = `You are AIDE, the in-app operations assistant for a fire protection service business. You are embedded inside the running web app, not a standalone chatbot.

YOU HAVE REAL TOOLS. Use them. When the user asks to find, create, change or delete something, do it — don't just describe what they could do. The tools work against the same database the rest of the app reads from, so every change is immediately visible.

BEHAVIOUR RULES:
- First, if you need data, call db_search (or get_kpi_summary for dashboard overviews). Never ask the user for an id — resolve it yourself.
- After any db_create / db_update / db_delete, call ui_refresh so the page updates.
- After navigating, say one short sentence explaining what the user is now looking at.
- Be direct and operational. Australian English (colour, organise, prioritise). No AI filler, no "I'd be happy to", no apologies for using tools.
- When the user asks a destructive question ("delete …"), confirm in one line before calling db_delete unless the target is a todo or a note.
- When the user asks to mark a job or wip as done/scheduled/on-hold, use db_update with the right status.
- When a request spans multiple records (e.g. "assign all open repairs to Gordon"), do it in one tool-chain: search → iterate updates → refresh.

DOMAIN CONTEXT:
- The operations pipeline: jobs → wip → quotes → defects → invoices
- Uptick task lifecycle: Not Ready → Ready → Scheduled → In Progress → Performed → Completed
- Status values for wip_records: Open | In Progress | Quoted | Scheduled | Completed | On Hold
- Status values for jobs: Open | In Progress | Scheduled | Done | Waiting
- Priority values: Critical | High | Medium | Low
- Current techs: Darren Brailey, Gordon Jenkins, Haider Al-Heyoury, John Minai, Nu Unasa

RESPONSE STYLE:
- Short sentences. Numbers when relevant. One short closing line after each action ("Done — T-39833 now shows Scheduled.")
- Never dump raw tool output as JSON into the chat — summarise in plain English.`;

router.post("/chat/agent", async (req, res, next) => {
  try {
    const { section, message, history } = req.body as {
      section?: string;
      message: string;
      history?: { role: "user" | "assistant"; content: string }[];
    };

    if (!message) {
      res.status(400).json({ error: "message is required" });
      return;
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");

    const send = (type: string, payload: Record<string, any> = {}) => {
      if (res.writableEnded) return;
      res.write(`data: ${JSON.stringify({ type, ...payload })}\n\n`);
    };

    let clientGone = false;
    req.on("close", () => {
      clientGone = true;
    });

    const messages: any[] = [];
    if (history?.length) {
      for (const h of history.filter((m) => m.content?.trim())) {
        messages.push({ role: h.role, content: h.content });
      }
    }
    messages.push({ role: "user", content: message });

    const systemPrompt = section
      ? `${AGENT_SYSTEM_PROMPT}\n\nThe user is currently on the "${section}" section of the app, so skew searches to that context when ambiguous.`
      : AGENT_SYSTEM_PROMPT;

    let iteration = 0;
    while (iteration < MAX_ITERATIONS && !clientGone) {
      iteration++;

      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 4096,
        system: systemPrompt,
        tools: AGENT_TOOLS as any,
        messages,
      });

      // Stream any text blocks from the response
      for (const block of response.content) {
        if (block.type === "text") {
          if (block.text) send("text", { content: block.text });
        }
      }

      const toolUses = response.content.filter((b: any) => b.type === "tool_use");
      if (toolUses.length === 0) {
        send("done");
        res.end();
        return;
      }

      // Append the assistant turn so Claude can reference its own tool_use blocks
      messages.push({ role: "assistant", content: response.content });

      const toolResults: any[] = [];
      for (const tu of toolUses as any[]) {
        if (clientGone) break;
        send("tool_start", { name: tu.name, input: tu.input });
        try {
          const { result, uiAction } = await executeAgentTool(tu.name, tu.input ?? {});
          toolResults.push({
            type: "tool_result",
            tool_use_id: tu.id,
            content: JSON.stringify(result),
          });
          send("tool_result", { name: tu.name, ok: true });
          if (uiAction) send("ui_action", { action: uiAction });
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          toolResults.push({
            type: "tool_result",
            tool_use_id: tu.id,
            content: `Error: ${msg}`,
            is_error: true,
          });
          send("tool_result", { name: tu.name, ok: false, error: msg });
        }
      }

      messages.push({ role: "user", content: toolResults });

      if (response.stop_reason === "end_turn") {
        send("done");
        res.end();
        return;
      }
    }

    // Ran out of iterations — tell the client we bailed cleanly
    if (!clientGone) {
      send("text", { content: "\n\n(stopped — hit the 8-step tool limit, ask me to continue if needed)" });
      send("done");
      res.end();
    }
  } catch (err) {
    try {
      if (!res.writableEnded) {
        res.write(`data: ${JSON.stringify({ type: "error", error: (err as Error)?.message ?? "agent error" })}\n\n`);
        res.end();
      }
    } catch {
      // ignore
    }
    next(err);
  }
});

export default router;
