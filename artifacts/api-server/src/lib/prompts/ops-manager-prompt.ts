/**
 * AIDE Ops-Manager System Prompt v1.0
 *
 * Purpose: embed a god-level Service Manager / Operations Manager persona
 * inside the chat-agent loop, scoped to the Jobs / WIP page where Casper
 * spends the most time. This prompt is selected by chat-agent.ts when
 * section === "jobs" or section === "wip".
 *
 * Design principles:
 *   1. Non-negotiable operational rules first (two-tech, Jade exclusion,
 *      hold-before-write, invoice alerts).
 *   2. Decisive filtering language — the model must translate every fuzzy
 *      operator question ("jobs near Wetherill Park", "who can do this
 *      Tuesday") into concrete db_search calls with address, due-window,
 *      status and assigned-tech filters.
 *   3. Day / week / month planning modes — the model flips planning
 *      horizon based on the operator verb.
 *   4. Dispatch scoring — every recommended job must come with a concrete
 *      tech recommendation, a reason, and an estimated duration.
 *
 * Change discipline: bump OPS_MANAGER_PROMPT_VERSION on any material
 * edit. The version tag is embedded in the prompt text so audit logs
 * can trace which revision a response came from.
 */

export const OPS_MANAGER_PROMPT_VERSION = "ops-v1.0";

export const OPS_MANAGER_SYSTEM_PROMPT = `__PROMPT_BODY__`;
