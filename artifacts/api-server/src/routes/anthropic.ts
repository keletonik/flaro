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
- When Casper drops an email — triage it IMMEDIATELY and fully using the EMAIL_TRIAGE action, plus create any relevant todos/jobs
- When Casper drops an image — describe what you see and extract any relevant information (job details, site names, dates, issues, compliance items, etc.)
- When Casper mentions needing to do something — proactively offer to log it as a todo or job

DROPPED CONTENT — When Casper drops an email or file:
1. Emails: ALWAYS produce an EMAIL_TRIAGE action block, extract ALL action items as CREATE_TODO actions, and create a CREATE_JOB if a site visit is needed
2. Images: Describe what you see. If it's a job site photo, document, report or certificate — extract the relevant info and create appropriate jobs/notes/todos
3. Documents/text: Extract all relevant data, create appropriate records

ACTIONS — You can take real actions in Casper's app:

1. CREATE_JOB — Creates a new job in the Jobs page
2. CREATE_NOTE — Creates a note in the Notes page
3. CREATE_TODO — Creates a to-do checklist item
4. UPDATE_JOB_STATUS — Changes a job's status
5. EMAIL_TRIAGE — Triages an email into a structured breakdown

HOW TO USE ACTIONS (can use multiple in one response):
<aide-action>{"type":"CREATE_JOB","data":{"site":"...","client":"...","actionRequired":"...","priority":"High","status":"Open"}}</aide-action>
<aide-action>{"type":"CREATE_NOTE","data":{"text":"...","category":"Urgent|To Do|To Ask|Schedule","owner":"Casper"}}</aide-action>
<aide-action>{"type":"CREATE_TODO","data":{"text":"...","priority":"Critical|High|Medium|Low","category":"Work|Personal|Follow-up|Compliance|Admin"}}</aide-action>
<aide-action>{"type":"EMAIL_TRIAGE","data":{"site":"...","client":"...","contact":"...","priority":"Critical|High|Medium|Low","whatHappened":"...","whereThingsStand":"...","whatNeedsToHappen":"...","watchOutFor":"...","actionRequired":"..."}}</aide-action>

RULES:
- Always include a natural language response alongside actions
- For dropped emails: EMAIL_TRIAGE is mandatory. Also create todos for each action item
- For dropped images: describe what you see, then create relevant records
- Always confirm in your text what actions you've taken
- Priority assessment: Critical = safety/compliance risk, regulatory deadline; High = client impact, this week; Medium = this fortnight; Low = when convenient`;

// Strip HTML tags and decode basic entities for email text extraction
function htmlToPlainText(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/tr>/gi, "\n")
    .replace(/<\/td>/gi, " | ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const router = Router();

router.get("/anthropic/conversations", async (req, res) => {
  const result = await db.select().from(conversations).orderBy(conversations.createdAt);
  res.json(result.map(c => ({ ...c, createdAt: c.createdAt.toISOString() })));
});

router.post("/anthropic/conversations", async (req, res) => {
  const parsed = CreateAnthropicConversationBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid request body" }); return; }
  const [conv] = await db.insert(conversations).values({ title: parsed.data.title }).returning();
  res.status(201).json({ ...conv, createdAt: conv.createdAt.toISOString() });
});

router.get("/anthropic/conversations/:id", async (req, res) => {
  const parsed = GetAnthropicConversationParams.safeParse(req.params);
  if (!parsed.success) { res.status(400).json({ error: "Invalid params" }); return; }
  const [conv] = await db.select().from(conversations).where(eq(conversations.id, parsed.data.id));
  if (!conv) { res.status(404).json({ error: "Conversation not found" }); return; }
  const msgs = await db.select().from(messages).where(eq(messages.conversationId, parsed.data.id)).orderBy(messages.createdAt);
  res.json({ ...conv, createdAt: conv.createdAt.toISOString(), messages: msgs.map(m => ({ ...m, createdAt: m.createdAt.toISOString() })) });
});

router.delete("/anthropic/conversations/:id", async (req, res) => {
  const parsed = DeleteAnthropicConversationParams.safeParse(req.params);
  if (!parsed.success) { res.status(400).json({ error: "Invalid params" }); return; }
  const [conv] = await db.select().from(conversations).where(eq(conversations.id, parsed.data.id));
  if (!conv) { res.status(404).json({ error: "Conversation not found" }); return; }
  await db.delete(conversations).where(eq(conversations.id, parsed.data.id));
  res.status(204).end();
});

router.get("/anthropic/conversations/:id/messages", async (req, res) => {
  const parsed = ListAnthropicMessagesParams.safeParse(req.params);
  if (!parsed.success) { res.status(400).json({ error: "Invalid params" }); return; }
  const msgs = await db.select().from(messages).where(eq(messages.conversationId, parsed.data.id)).orderBy(messages.createdAt);
  res.json(msgs.map(m => ({ ...m, createdAt: m.createdAt.toISOString() })));
});

router.post("/anthropic/conversations/:id/messages", async (req, res) => {
  const paramsParsed = SendAnthropicMessageParams.safeParse(req.params);
  if (!paramsParsed.success) { res.status(400).json({ error: "Invalid params" }); return; }

  const bodyParsed = SendAnthropicMessageBody.safeParse(req.body);
  if (!bodyParsed.success) { res.status(400).json({ error: "Invalid request body" }); return; }

  const conversationId = paramsParsed.data.id;
  const [conv] = await db.select().from(conversations).where(eq(conversations.id, conversationId));
  if (!conv) { res.status(404).json({ error: "Conversation not found" }); return; }

  // Extract multimodal fields (not in Zod schema — accessed directly)
  const images: string[] = Array.isArray(req.body.images) ? req.body.images : [];
  const emailHtml: string | null = typeof req.body.emailHtml === "string" ? req.body.emailHtml : null;
  const hasAttachments = images.length > 0 || emailHtml;

  // Build a text-only version of the user message for DB storage
  let dbContent = bodyParsed.data.content;
  if (emailHtml) {
    const emailText = htmlToPlainText(emailHtml);
    dbContent = `[EMAIL DROPPED]\n${emailText}${bodyParsed.data.content ? `\n\nCasper's note: ${bodyParsed.data.content}` : ""}`;
  } else if (images.length > 0) {
    dbContent = `[${images.length} image(s) attached]${bodyParsed.data.content ? ` — ${bodyParsed.data.content}` : ""}`;
  }

  await db.insert(messages).values({ conversationId, role: "user", content: dbContent });

  // Build conversation history (all previous messages as plain text)
  const allMessages = await db.select().from(messages).where(eq(messages.conversationId, conversationId)).orderBy(messages.createdAt);

  // Previous messages (all except the last user message we just inserted).
  // Skip any messages with empty content — Claude rejects them.
  const historyMessages = allMessages.slice(0, -1)
    .filter(m => m.content && m.content.trim().length > 0)
    .map(m => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

  // Build the latest user message content (multimodal if needed)
  type ContentBlock =
    | { type: "text"; text: string }
    | { type: "image"; source: { type: "base64"; media_type: string; data: string } };

  const latestContent: ContentBlock[] = [];

  // Add image blocks first (Claude sees them before the text)
  for (const img of images) {
    const match = img.match(/^data:(image\/(?:jpeg|jpg|png|gif|webp));base64,(.+)$/);
    if (match) {
      latestContent.push({
        type: "image",
        source: { type: "base64", media_type: match[1], data: match[2] },
      });
    }
  }

  // Build text content
  let textContent = "";
  if (emailHtml) {
    const emailText = htmlToPlainText(emailHtml);
    textContent = `[EMAIL DROPPED BY CASPER — TRIAGE THIS IMMEDIATELY]\n\n${emailText}`;
    if (bodyParsed.data.content) textContent += `\n\nCasper's note: ${bodyParsed.data.content}`;
  } else if (images.length > 0) {
    textContent = bodyParsed.data.content
      ? `Casper has attached ${images.length} image(s). His note: ${bodyParsed.data.content}`
      : `Casper has dropped ${images.length} image(s) for you to analyse. Describe what you see and extract any relevant job/site/compliance information.`;
  } else {
    textContent = bodyParsed.data.content;
  }

  latestContent.push({ type: "text", text: textContent });

  // Compose the full messages array for Claude
  const claudeMessages: any[] = [
    ...historyMessages,
    {
      role: "user",
      content: latestContent.length === 1 && latestContent[0].type === "text"
        ? latestContent[0].text   // plain string for simple text messages
        : latestContent,          // array for multimodal
    },
  ];

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  let fullResponse = "";
  let clientDisconnected = false;

  // Abort the Claude stream if the client disconnects (saves tokens + avoids writes to closed socket)
  req.on("close", () => { clientDisconnected = true; });

  try {
    const stream = anthropic.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: 8192,
      system: SYSTEM_PROMPT,
      messages: claudeMessages,
    });

    for await (const event of stream) {
      if (clientDisconnected) { stream.abort(); break; }
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        fullResponse += event.delta.text;
        res.write(`data: ${JSON.stringify({ content: event.delta.text })}\n\n`);
      }
    }

    if (!clientDisconnected && fullResponse) {
      await db.insert(messages).values({ conversationId, role: "assistant", content: fullResponse });
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    }
  } catch (err: any) {
    console.error("Claude error:", err?.message || err);
    if (!clientDisconnected) {
      res.write(`data: ${JSON.stringify({ error: "AI response failed. Please try again." })}\n\n`);
    }
  }

  res.end();
});

export default router;
