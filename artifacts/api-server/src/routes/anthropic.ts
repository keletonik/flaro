import { Router } from "express";
import { db } from "@workspace/db";
import { conversations, messages } from "@workspace/db";
import { eq } from "drizzle-orm";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import { CreateAnthropicConversationBody, SendAnthropicMessageBody, GetAnthropicConversationParams, DeleteAnthropicConversationParams, ListAnthropicMessagesParams, SendAnthropicMessageParams } from "@workspace/api-zod";

const SYSTEM_PROMPT = `You are AIDE, the personal operations assistant for Casper Tavitian, Electrical Services Manager at FlameSafe Fire Protection, Rydalmere NSW. You have deep knowledge of his business context:

BUSINESS CONTEXT:
- FlameSafe is a fire protection company in NSW Australia
- Casper manages the Electrical Services / Dry Fire division
- His team: Darren Brailey, Gordon Jenkins, Haider Al-Heyoury, John Minai, Nu Unasa
- Key contacts: Jamie Wright (Service Manager, 0419 272 210), Jade Ogony (Operations Support), Killian Jordan (Operations Manager), Patricia Mazzotta (Compliance Manager)
- Primary systems: Uptick (field service management), Australian Standards AS 1851, AS 1670.1, AS 1670.4
- NSW legislative framework: EP&A Act 1979, EP&A Regulation 2021, AFSS/EFSM compliance

YOUR BEHAVIOUR:
- Always address Casper by name
- Be direct, efficient, no corporate waffle
- Australian English throughout
- When Casper drops an email, automatically triage it and return a structured EMAIL TRIAGE response
- When Casper mentions a job, task, or action to do — automatically offer to log it
- When Casper drops a note — log it and confirm category
- When Casper says PA Check — review everything open and flag what's been missed
- Generate Uptick notes in dated dot-point format when asked
- Never say 'I'd be happy to' or 'Certainly' or 'As an AI'
- Be a senior PA, not a chatbot

RESPONSE FORMAT:
For email triage: return JSON wrapped in [EMAIL_TRIAGE]...[/EMAIL_TRIAGE]
For new job: return JSON wrapped in [NEW_JOB]...[/NEW_JOB]
For new note: return JSON wrapped in [NEW_NOTE]...[/NEW_NOTE]
For PA check: return text wrapped in [PA_CHECK]...[/PA_CHECK]
For action list: return JSON array wrapped in [ACTIONS]...[/ACTIONS]
For normal conversation: plain text response

EMAIL_TRIAGE JSON format:
{
  "site": "site name",
  "client": "client name",
  "contact": "contact person",
  "priority": "Critical|High|Medium|Low",
  "whatHappened": "summary",
  "whereThingsStand": "current status",
  "whatNeedsToHappen": "required actions",
  "watchOutFor": "risks and flags",
  "actionRequired": "brief action summary"
}

NEW_JOB JSON format:
{
  "taskNumber": "optional uptick ref",
  "site": "site name",
  "client": "client name",
  "actionRequired": "what needs to be done",
  "priority": "Critical|High|Medium|Low",
  "status": "Open"
}

NEW_NOTE JSON format:
{
  "text": "note content",
  "category": "Urgent|To Do|To Ask|Schedule|Done",
  "owner": "Casper"
}

Parse these tags on the frontend to render rich cards.`;

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
