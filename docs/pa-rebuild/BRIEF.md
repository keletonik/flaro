# PA Rebuild — Master Brief

**Role played in this document:** AI Engineer + Prompt Engineer + Product Designer.
**Target artefact:** the `/chat` page of the AIDE web app, to be renamed and
rebuilt as `/pa` — a full-fat Personal Assistant surface for the operator.
**Review gate:** a 5-person independent panel (Personas A-E) audits the
brief BEFORE execution and again AFTER execution.

---

## 0. Why we're rebuilding this

The current `/chat` page (1,232 lines in `artifacts/aide/src/pages/chat.tsx`)
is a legacy Anthropic-conversation-store viewer. It does not call the
agent tool-use endpoint, so the user cannot:

- Create or update todos from the chat
- Set reminders
- Trigger navigation or refresh
- Ask any question that needs live database reads

Tool-use is currently only reachable through `EmbeddedAgentChat` — the
small drawer summoned from the floating AIDE Assistant. That works, but
it's not the "full-functioning PA" the operator has asked for. The
dedicated page should be the primary PA surface: voice in, Notion-style
rendering out, reminders, slash commands, memory.

The 5-person panel below judges the brief on whether it actually delivers
that, or whether it's a cosmetic rewrite.

---

## 1. Requirements — the operator's exact asks

1. **Rename Chat → PA** throughout the UI.
2. **Voice input** — the operator can speak to it, not just type.
3. **Action capabilities** — add/remove todos, set reminders, everything
   a desktop PA would do.
4. **Notion-style UI** — best-in-class. Combine the best of the leading
   chat PAs.
5. **Debugging + audit process** — explicit, documented, not an
   afterthought.
6. **5-panel independent audit** — review gate before and after.

---

## 2. Prior art — the reference set

I'm listing the platforms my training covers so the rebuild is
justifiable. I cannot run live web searches from this session; content
is drawn from documentation and product tours observed through my
training cutoff (May 2025).

| Product | What we steal |
|---|---|
| **Notion AI** | Slash-command menu at the input, inline action cards, block-based render |
| **Linear Assistant** | Keyboard-first, tight palette, per-entity mentions |
| **ChatGPT Desktop** | Clean split pane, streaming text, tool-use visible, voice-to-text |
| **Claude.ai** | Reactions on messages, branching, artifact panel on the right |
| **Perplexity** | Citation cards, source chips, follow-up question chips |
| **Cursor Chat** | @-mention autocomplete, inline diff view, conversation context |
| **Raycast AI** | Quick actions surfaced directly on assistant output |
| **Superhuman** | Speed, zero-latency keybindings, Cmd-K everywhere |
| **Mem** | Long-term memory surfaced as context cards |
| **Copilot Voice** | Web Speech API voice in + out, push-to-talk |

**Synthesis:** a three-column Notion-shaped page.
- Left (260 px): conversation list + pinned items + "today" reminders.
- Centre (flex): message stream with markdown + tool-use tree +
  reactions + follow-up chips.
- Right (320 px, collapsible): artifact / context panel — shows which
  DB entities the assistant has touched this turn, plus open reminders.

Input row at the bottom of the centre column: slash-command menu, voice
button, @-mention autocomplete, multi-line expand, send shortcut.
