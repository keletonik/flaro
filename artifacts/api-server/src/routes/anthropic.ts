import { Router } from "express";
import { db } from "@workspace/db";
import { conversations, messages } from "@workspace/db";
import { eq } from "drizzle-orm";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import { CreateAnthropicConversationBody, SendAnthropicMessageBody, GetAnthropicConversationParams, DeleteAnthropicConversationParams, ListAnthropicMessagesParams, SendAnthropicMessageParams } from "@workspace/api-zod";

function buildSystemPrompt(userName: string = "the user") {
  return `You are the personal operations assistant for ${userName} at FlameSafe Fire Protection, Rydalmere NSW.

BUSINESS CONTEXT:
- FlameSafe is a fire protection company in NSW, Australia
- The user manages the Electrical Services / Dry Fire division
- Primary system: Uptick (field service management)
- Standards: AS 1851-2012, AS 1670.1-2018, AS 1670.4-2018
- NSW framework: EP&A Act 1979, EP&A Regulation 2021, AFSS/EFSM

TEAM — ELECTRICAL SERVICES:
| Name | Email |
| Darren Brailey | darren@flamesafe.com.au |
| Gordon Jenkins (Gordy) | gordon@flamesafe.com.au |
| Haider Al-Heyoury | haider@flamesafe.com.au |
| John Minai | john.m@flamesafe.com.au |
| Nu Unasa (Nuu) | nuu@flamesafe.com.au |

KEY INTERNAL CONTACTS:
| Name | Role | Contact |
| Jamie Wright | Service Manager | 0419 272 210 — jamie.wright@flamesafe.com.au |
| Jade Ogony | Operations Support | jade.ogony@flamesafe.com.au |
| Killian Jordan | Operations Manager | killian@flamesafe.com.au |
| Patricia Mazzotta | Compliance Manager | patricia@flamesafe.com.au |
| Chris Waters | Construction Manager | chris@flamesafe.com.au |
| Shannon Rawlings | Fire Safety Assessor | Shannon@flamesafe.com.au |

ON-CALL ROSTER — DRY FIRE TEAM | APRIL–JUNE 2026:
10 Apr Fri — Darren Brailey | 11-12 Apr Sat-Sun — Darren Brailey
13 Apr Mon — Gordon Jenkins | 16 Apr Thu — Haider Al-Heyoury
21 Apr Tue — Haider Al-Heyoury | 22 Apr Wed — Nu Unasa
28 Apr Tue — John Minai | 29 Apr Wed — Haider Al-Heyoury
30 Apr Thu — Nu Unasa | 1-3 May Fri-Sun — John Minai
4 May Mon — Gordon Jenkins | 5 May Tue — Haider Al-Heyoury
6 May Wed — Nu Unasa | 11 May Mon — John Minai
12 May Tue — Darren Brailey | 14 May Thu — Nu Unasa
15-17 May Fri-Sun — Haider Al-Heyoury | 19 May Tue — Nu Unasa
20 May Wed — Darren Brailey | 21 May Thu — John Minai
26 May Tue — Darren Brailey | 27 May Wed — Haider Al-Heyoury
28 May Thu — Nu Unasa | 29-31 May Fri-Sun — John Minai
3 Jun Wed — Darren Brailey | 4 Jun Thu — Haider Al-Heyoury
5-7 Jun Fri-Sun — Gordon Jenkins

YOUR BEHAVIOUR:
- Always address the user by their first name in your first sentence
- Be direct, efficient, no corporate waffle, no AI language
- Australian English throughout (colour, organise, prioritise, etc.)
- Never say "I'd be happy to", "Certainly!", or any robotic phrasing
- Be a senior executive assistant, not a chatbot
- Run a PA check on every interaction — flag missed, overdue, or conflicting items
- When the user says "PA Check" — give a crisp summary of open items and what matters today
- When the user drops a note — categorise and log it immediately
- When the user drops an email — produce: What's Happened / Where Things Stand / What Needs to Happen / Watch Out For + YOUR ACTION REQUIRED flag
- Uptick notes — dated dot-point format, first person, written as a qualified fire safety technician
- Never auto-execute — present options, wait for the user to confirm
- Flag the Centennial Park evac plans follow-up every status check until done (due Tuesday 15 April, follow up Monday 13 April)
- When the user drops an image — describe what you see and extract any relevant information (job details, site names, dates, issues, compliance items, etc.)
- When the user mentions needing to do something — proactively offer to log it as a todo or job

DROPPED CONTENT — When the user drops an email or file:
1. Emails: ALWAYS produce an EMAIL_TRIAGE action block, extract ALL action items as CREATE_TODO actions, and create a CREATE_JOB if a site visit is needed
2. Images: Describe what you see. If it's a job site photo, document, report or certificate — extract the relevant info and create appropriate jobs/notes/todos
3. Documents/text: Extract all relevant data, create appropriate records

ACTIONS — You can take real actions in the app:

1. CREATE_JOB — Creates a new WIP in the WIPs page
2. CREATE_NOTE — Creates a note in the Notes page
3. CREATE_TODO — Creates a to-do checklist item
4. UPDATE_JOB_STATUS — Changes a WIP's status
5. EMAIL_TRIAGE — Triages an email into a structured breakdown

HOW TO USE ACTIONS (can use multiple in one response):
<ops-action>{"type":"CREATE_JOB","data":{"site":"...","client":"...","actionRequired":"...","priority":"High","status":"Open"}}</ops-action>
<ops-action>{"type":"CREATE_NOTE","data":{"text":"...","category":"Urgent|To Do|To Ask|Schedule|Quote|Follow Up|Investigate","owner":"User"}}</ops-action>
<ops-action>{"type":"CREATE_TODO","data":{"text":"...","priority":"Critical|High|Medium|Low","category":"Work|Personal|Follow-up|Compliance|Admin"}}</ops-action>
<ops-action>{"type":"EMAIL_TRIAGE","data":{"site":"...","client":"...","contact":"...","priority":"Critical|High|Medium|Low","whatHappened":"...","whereThingsStand":"...","whatNeedsToHappen":"...","watchOutFor":"...","actionRequired":"..."}}</ops-action>

RULES:
- Always include a natural language response alongside actions
- For dropped emails: EMAIL_TRIAGE is mandatory. Also create todos for each action item
- For dropped images: describe what you see, then create relevant records
- Always confirm in your text what actions you've taken
- Priority assessment: Critical = safety/compliance risk, regulatory deadline; High = client impact, this week; Medium = this fortnight; Low = when convenient`;
}

const SYSTEM_PROMPT = buildSystemPrompt("Casper Tavitian"); // default fallback

function htmlToPlainText(html: string): string {
  let text = html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/tr>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<\/h[1-6]>/gi, "\n\n")
    .replace(/<\/blockquote>/gi, "\n")
    .replace(/<td[^>]*>/gi, " ")
    .replace(/<th[^>]*>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'")
    .replace(/&rdquo;/g, '"')
    .replace(/&ldquo;/g, '"')
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–")
    .replace(/&hellip;/g, "...")
    .replace(/&#\d+;/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n /g, "\n")
    .replace(/ \n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return text;
}

import { getSessionUser } from "./auth";

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

  const images: string[] = Array.isArray(req.body.images) ? req.body.images : [];
  const emailHtml: string | null = typeof req.body.emailHtml === "string" ? req.body.emailHtml : null;
  const emailPlainText: string | null = typeof req.body.emailPlainText === "string" ? req.body.emailPlainText : null;
  const files: { name: string; text: string | null; dataUrl: string | null; size?: number }[] = Array.isArray(req.body.files) ? req.body.files : [];
  const hasAttachments = images.length > 0 || emailHtml || emailPlainText || files.length > 0;

  let dbContent = bodyParsed.data.content;
  if (emailHtml || emailPlainText) {
    const fromHtml = emailHtml ? htmlToPlainText(emailHtml) : "";
    const fromPlain = emailPlainText || "";
    const emailText = fromPlain.length > fromHtml.length ? fromPlain : fromHtml;
    dbContent = `[EMAIL DROPPED]\n${emailText}${bodyParsed.data.content ? `\n\nUser's note: ${bodyParsed.data.content}` : ""}`;
  } else if (files.length > 0) {
    const fileNames = files.map(f => f.name).join(", ");
    const textContents = files.filter(f => f.text).map(f => `[${f.name}]\n${f.text}`).join("\n\n");
    dbContent = `[Files: ${fileNames}]\n${textContents || "(binary files)"}${bodyParsed.data.content ? `\n\nUser's note: ${bodyParsed.data.content}` : ""}`;
  } else if (images.length > 0) {
    dbContent = `[${images.length} image(s) attached]${bodyParsed.data.content ? ` — ${bodyParsed.data.content}` : ""}`;
  }

  await db.insert(messages).values({ conversationId, role: "user", content: dbContent });

  // Build conversation history (all previous messages as plain text)
  const allMessages = await db.select().from(messages).where(eq(messages.conversationId, conversationId)).orderBy(messages.createdAt);

  // Previous messages (all except the last user message we just inserted).
  // Skip any messages with empty content — LLM rejects them.
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

  // Add image blocks first (LLM sees them before the text)
  for (const img of images) {
    const match = img.match(/^data:(image\/(?:jpeg|jpg|png|gif|webp));base64,(.+)$/);
    if (match) {
      latestContent.push({
        type: "image",
        source: { type: "base64", media_type: match[1], data: match[2] },
      });
    }
  }

  let textContent = "";
  if (emailHtml || emailPlainText) {
    const fromHtml = emailHtml ? htmlToPlainText(emailHtml) : "";
    const fromPlain = emailPlainText || "";
    const emailText = fromPlain.length > fromHtml.length ? fromPlain : fromHtml;
    const secondSource = fromPlain.length > fromHtml.length ? fromHtml : fromPlain;
    let combined = emailText;
    if (secondSource && secondSource.length > 30 && Math.abs(secondSource.length - emailText.length) > 50) {
      combined += `\n\n--- ADDITIONAL EMAIL CONTENT (secondary extraction) ---\n${secondSource}`;
    }
    textContent = `[EMAIL DROPPED — TRIAGE THIS IMMEDIATELY]\n\n${combined}`;
    if (bodyParsed.data.content) textContent += `\n\nUser's note: ${bodyParsed.data.content}`;
  } else if (files.length > 0) {
    // Build file content for the LLM
    const fileParts = files.map(f => {
      if (f.text) return `=== FILE: ${f.name} ===\n${f.text}`;
      return `=== FILE: ${f.name} (${f.size ? Math.round(f.size / 1024) + " KB" : "binary"}) === [Binary file — content not extractable in browser]`;
    });
    textContent = `The user has attached ${files.length} file(s). Analyse the content and extract any relevant information, action items, or data.\n\n${fileParts.join("\n\n")}`;
    if (bodyParsed.data.content && bodyParsed.data.content !== "Please triage and analyse the attached content.") {
      textContent += `\n\nUser's note: ${bodyParsed.data.content}`;
    }
  } else if (images.length > 0) {
    textContent = bodyParsed.data.content
      ? `The user has attached ${images.length} image(s). His note: ${bodyParsed.data.content}`
      : `The user has dropped ${images.length} image(s) for you to analyse. Describe what you see and extract any relevant job/site/compliance information.`;
  } else {
    textContent = bodyParsed.data.content;
  }

  latestContent.push({ type: "text", text: textContent });

  // Compose the full messages array for LLM
  const llmMessages: any[] = [
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
  res.setHeader("X-Accel-Buffering", "no");

  let fullResponse = "";
  let clientDisconnected = false;

  // Abort the LLM stream if the client disconnects (saves tokens + avoids writes to closed socket)
  req.on("close", () => { clientDisconnected = true; });

  try {
    const stream = anthropic.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: 8192,
      system: buildSystemPrompt(getSessionUser(req.headers.authorization)?.displayName || "the user"),
      messages: llmMessages,
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
    console.error("LLM error:", err?.message || err);
    if (!clientDisconnected) {
      res.write(`data: ${JSON.stringify({ error: "AI response failed. Please try again." })}\n\n`);
    }
  }

  res.end();
});

export default router;
