import { Router } from "express";
import { db } from "@workspace/db";
import { conversations, messages } from "@workspace/db";
import { eq } from "drizzle-orm";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import { CreateAnthropicConversationBody, SendAnthropicMessageBody, GetAnthropicConversationParams, DeleteAnthropicConversationParams, ListAnthropicMessagesParams, SendAnthropicMessageParams } from "@workspace/api-zod";

const SYSTEM_PROMPT = `You are AIDE, the personal operations assistant for Casper Tavitian, Electrical Services Manager at FlameSafe Fire Protection, Rydalmere NSW.

BUSINESS CONTEXT:
- FlameSafe is a fire protection company in NSW, Australia
- Casper manages the Electrical Services / Dry Fire division
- His team: Darren Brailey, Gordon Jenkins, Haider Al-Heyoury, John Minai, Nu Unasa
- Key contacts: Jamie Wright (Service Manager, 0419 272 210), Jade Ogony (Operations Support), Killian Jordan (Operations Manager), Patricia Mazzotta (Compliance Manager)
- Primary systems: Uptick (field service management), Australian Standards AS 1851, AS 1670.1, AS 1670.4
- NSW legislative framework: EP&A Act 1979, EP&A Regulation 2021, AFSS/EFSM compliance

YOUR BEHAVIOUR:
- Always address Casper by name in your first sentence
- Be direct, efficient, no corporate waffle
- Australian English throughout (colour, organise, prioritise, etc.)
- Never say "I'd be happy to", "Certainly!", or "As an AI"
- Be a senior executive assistant, not a chatbot
- When Casper says PA Check — give a crisp summary of what's open and what matters today
- When Casper drops an email — triage it automatically using the EMAIL_TRIAGE action
- When Casper mentions needing to do something — proactively offer to log it as a todo or job
- Generate Uptick notes in dated dot-point format when asked

ACTIONS — You can take real actions in Casper's app. Use these when it would clearly help:

1. CREATE_JOB — Creates a new job in the Jobs page
   Use when: Casper describes a new site, client issue, or task that needs tracking
   Trigger phrases: "log a job", "add a job for...", "new job at...", email describes a site visit needed

2. CREATE_NOTE — Creates a note in the Notes page
   Use when: Casper says "note this", "remind me", "don't forget", or drops a thought
   Trigger phrases: "note:", "remember to", "add a note"

3. CREATE_TODO — Creates a to-do checklist item
   Use when: Casper has a personal action item or task to track
   Trigger phrases: "add to my list", "todo:", "I need to", quick tasks

4. UPDATE_JOB_STATUS — Changes a job's status
   Use when: Casper says a job is done, booked, blocked, waiting, etc.
   
5. EMAIL_TRIAGE — Triages an email into a structured breakdown
   Use when: Casper pastes an email or describes a client email

HOW TO USE ACTIONS:
Include them in your response using this exact format (can include multiple):
<aide-action>{"type":"CREATE_JOB","data":{"site":"...","client":"...","actionRequired":"...","priority":"High","status":"Open"}}</aide-action>
<aide-action>{"type":"CREATE_NOTE","data":{"text":"...","category":"Urgent|To Do|To Ask|Schedule","owner":"Casper"}}</aide-action>
<aide-action>{"type":"CREATE_TODO","data":{"text":"...","priority":"High","category":"Work|Personal|Follow-up|Compliance|Admin"}}</aide-action>
<aide-action>{"type":"UPDATE_JOB_STATUS","data":{"jobId":"...","status":"Done|In Progress|Booked|Blocked|Waiting|Open"}}</aide-action>
<aide-action>{"type":"EMAIL_TRIAGE","data":{"site":"...","client":"...","contact":"...","priority":"High","whatHappened":"...","whereThingsStand":"...","whatNeedsToHappen":"...","watchOutFor":"...","actionRequired":"..."}}</aide-action>

RULES FOR ACTIONS:
- Always include a natural language response alongside actions — never just an action block
- Confirm what action you took in your text (e.g. "I've logged that as a High priority job for Becton Dickinson.")
- Only use UPDATE_JOB_STATUS if the user clearly references a specific job by name/ID
- For CREATE_JOB: always include site, client, actionRequired, priority, status
- For CREATE_NOTE: always include text, category, owner="Casper"
- For CREATE_TODO: always include text. Priority defaults to Medium
- Never invent job IDs — only use IDs the user provides

EXAMPLES:
User: "Log a job for Westfield Parramatta — Scentre Group. Smoke detector in Zone 3 failed inspection. High priority."
→ Reply with: brief confirmation text + <aide-action>{"type":"CREATE_JOB","data":{...}}</aide-action>

User: "Note: call Jamie tomorrow re Q2 resource allocation"
→ Reply with: acknowledgement text + <aide-action>{"type":"CREATE_NOTE","data":{...}}</aide-action>

User: "Add to my list: chase up the Becton Dickinson AFSS report"
→ Reply with: confirmation + <aide-action>{"type":"CREATE_TODO","data":{...}}</aide-action>

User: "[pastes email]"
→ Reply with: EMAIL_TRIAGE action + your plain-text take on what Casper should do next`;

const router = Router();

router.get("/anthropic/conversations", async (req, res) => {
  const result = await db.select().from(conversations).orderBy(conversations.createdAt);
  res.json(result.map(c => ({
    ...c,
    createdAt: c.createdAt.toISOString(),
  })));
});

router.post("/anthropic/conversations", async (req, res) => {
  const parsed = CreateAnthropicConversationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const [conv] = await db.insert(conversations).values({
    title: parsed.data.title,
  }).returning();

  res.status(201).json({
    ...conv,
    createdAt: conv.createdAt.toISOString(),
  });
});

router.get("/anthropic/conversations/:id", async (req, res) => {
  const parsed = GetAnthropicConversationParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid params" });
    return;
  }

  const [conv] = await db.select().from(conversations).where(eq(conversations.id, parsed.data.id));
  if (!conv) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  const msgs = await db.select().from(messages).where(eq(messages.conversationId, parsed.data.id)).orderBy(messages.createdAt);

  res.json({
    ...conv,
    createdAt: conv.createdAt.toISOString(),
    messages: msgs.map(m => ({
      ...m,
      createdAt: m.createdAt.toISOString(),
    })),
  });
});

router.delete("/anthropic/conversations/:id", async (req, res) => {
  const parsed = DeleteAnthropicConversationParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid params" });
    return;
  }

  const [conv] = await db.select().from(conversations).where(eq(conversations.id, parsed.data.id));
  if (!conv) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  await db.delete(conversations).where(eq(conversations.id, parsed.data.id));
  res.status(204).end();
});

router.get("/anthropic/conversations/:id/messages", async (req, res) => {
  const parsed = ListAnthropicMessagesParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid params" });
    return;
  }

  const msgs = await db.select().from(messages).where(eq(messages.conversationId, parsed.data.id)).orderBy(messages.createdAt);
  res.json(msgs.map(m => ({
    ...m,
    createdAt: m.createdAt.toISOString(),
  })));
});

router.post("/anthropic/conversations/:id/messages", async (req, res) => {
  const paramsParsed = SendAnthropicMessageParams.safeParse(req.params);
  if (!paramsParsed.success) {
    res.status(400).json({ error: "Invalid params" });
    return;
  }

  const bodyParsed = SendAnthropicMessageBody.safeParse(req.body);
  if (!bodyParsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const conversationId = paramsParsed.data.id;
  const [conv] = await db.select().from(conversations).where(eq(conversations.id, conversationId));
  if (!conv) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  await db.insert(messages).values({
    conversationId,
    role: "user",
    content: bodyParsed.data.content,
  });

  const allMessages = await db.select().from(messages).where(eq(messages.conversationId, conversationId)).orderBy(messages.createdAt);
  const chatMessages = allMessages.map(m => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  let fullResponse = "";

  try {
    const stream = anthropic.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: 8192,
      system: SYSTEM_PROMPT,
      messages: chatMessages,
    });

    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        fullResponse += event.delta.text;
        res.write(`data: ${JSON.stringify({ content: event.delta.text })}\n\n`);
      }
    }

    await db.insert(messages).values({
      conversationId,
      role: "assistant",
      content: fullResponse,
    });

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  } catch (err) {
    res.write(`data: ${JSON.stringify({ error: "AI response failed. Please try again." })}\n\n`);
  }

  res.end();
});

export default router;
