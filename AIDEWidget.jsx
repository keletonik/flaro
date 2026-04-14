import { useState, useRef, useEffect, useCallback } from "react"

const SYSTEM_PROMPT = `You are the AIDE Service Ops Intelligence Engine — a superintelligent field operations AI built exclusively for Flamesafe Fire Protection's dry fire division in New South Wales.

You are not a chatbot. You are an operational system. You think in first principles, execute without ambiguity, and protect the business from missed revenue, mis-dispatched techs, and compliance exposure.

OPERATOR: Casper Tavitian, Electrical Services Manager, Dry Fire Division.

PRIME DIRECTIVES:
1. ORGANISE — find, filter, surface the right jobs for the right technician at the right time
2. UPDATE — receive updates, parse them, hold them, write them on command only
3. LOG — every status change and decision gets timestamped permanently
4. DIAGNOSE — fault descriptions get full technical diagnosis with standards references
5. PROTECT — flag every 2-tech job, requote need, blocked job, and invoicing gap

PERMANENT RULES:
- Jade Ogony is operations support, NOT a technician. Never include her in tech lists or KPIs.
- All 5-yearly inspections require minimum 2 technicians. Never recommend as 1-man.
- Never write updates to records until Casper explicitly confirms.
- Any PERFORMED task with Invoiced = No must be flagged immediately.
- Tasks with scope changes flagged as NEEDS REQUOTE before scheduling.

TRIPLE-CHECK PROTOCOL (runs on every data operation):
Pass 1 — Structural: no errors, no Jade in tech lists, no duplicate IDs
Pass 2 — Data accuracy: every value cross-validated against source to the dollar
Pass 3 — Maths: all KPIs re-derived independently from raw data

RESPONSE STYLE:
- Australian English. Direct. No padding. Lead with the answer.
- Never say: "It's important to note", "Certainly", "As an AI", "I'd be happy to"
- Flag uncertainty with: ⚠ VERIFY
- State CRITICAL at the top when critical
- No em dashes. Clean tables for tabular data. Prose for explanation.
- No references to Claude, Anthropic, or any AI system.

REVENUE MODEL:
- Monthly target: $180,000
- Win rate: ~60.5%
- Must quote: ~$297,692/month to collect $180k
- Current quoting pace: ~$48,551/month (6x below required)
- Revenue gap: ~$150,644/month
- Four levers: increase quote volume, invoice completed work, dispatch READY tasks, improve margin

TECHNICIAN ROSTER (11 field techs):
Bailey Arthur, Darren Brailey, Gordon Jenkins, Haider Al-Heyoury, Hugo, Jimmy Kak, John Minai, Nick Hollingsworth, Nu Unasa, Ryan Robinson, Tim Hu`

const ACCENT = "#E8431A"
const NAVY   = "#0F1C2E"
const PANEL  = "#141E2D"
const SURFACE= "#1A2535"
const BORDER = "#243044"
const TEXT   = "#E8ECF0"
const MUTED  = "#7A8999"
const GREEN  = "#22C55E"

export default function AIDEWidget() {
  const [open, setOpen]         = useState(true)
  const [expanded, setExpanded] = useState(false)
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "AIDE online. What do you need — jobs, updates, diagnostics, or revenue?"
    }
  ])
  const [input, setInput]     = useState("")
  const [loading, setLoading] = useState(false)
  const [dragging, setDragging]   = useState(false)
  const [resizing, setResizing]   = useState(false)
  const [pos, setPos]         = useState({ x: null, y: null })
  const [size, setSize]       = useState({ w: 420, h: 580 })

  const containerRef = useRef(null)
  const bottomRef    = useRef(null)
  const dragRef      = useRef(null)
  const resizeRef    = useRef(null)

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, loading])

  // Drag logic
  const onDragStart = useCallback((e) => {
    dragRef.current = {
      startX: e.clientX - (pos.x ?? (window.innerWidth - size.w - 24)),
      startY: e.clientY - (pos.y ?? (window.innerHeight - size.h - 24))
    }
    setDragging(true)
  }, [pos, size])

  const onDragMove = useCallback((e) => {
    if (!dragging || !dragRef.current) return
    setPos({
      x: Math.max(0, Math.min(window.innerWidth  - size.w, e.clientX - dragRef.current.startX)),
      y: Math.max(0, Math.min(window.innerHeight - size.h, e.clientY - dragRef.current.startY))
    })
  }, [dragging, size])

  const onDragEnd = useCallback(() => { setDragging(false) }, [])

  // Resize logic
  const onResizeStart = useCallback((e) => {
    e.stopPropagation()
    resizeRef.current = { startX: e.clientX, startY: e.clientY, startW: size.w, startH: size.h }
    setResizing(true)
  }, [size])

  const onResizeMove = useCallback((e) => {
    if (!resizing || !resizeRef.current) return
    setSize({
      w: Math.max(320, Math.min(700, resizeRef.current.startW + (e.clientX - resizeRef.current.startX))),
      h: Math.max(400, Math.min(window.innerHeight - 48, resizeRef.current.startH + (e.clientY - resizeRef.current.startY)))
    })
  }, [resizing])

  const onResizeEnd = useCallback(() => { setResizing(false) }, [])

  useEffect(() => {
    window.addEventListener("mousemove", onDragMove)
    window.addEventListener("mouseup", onDragEnd)
    window.addEventListener("mousemove", onResizeMove)
    window.addEventListener("mouseup", onResizeEnd)
    return () => {
      window.removeEventListener("mousemove", onDragMove)
      window.removeEventListener("mouseup", onDragEnd)
      window.removeEventListener("mousemove", onResizeMove)
      window.removeEventListener("mouseup", onResizeEnd)
    }
  }, [onDragMove, onDragEnd, onResizeMove, onResizeEnd])

  const send = async () => {
    const text = input.trim()
    if (!text || loading) return
    setInput("")

    const userMsg = { role: "user", content: text }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setLoading(true)

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.slice(-20), // last 20 turns
          system: SYSTEM_PROMPT
        })
      })
      const data = await res.json()
      const reply = data.content?.[0]?.text ?? "No response."
      setMessages(prev => [...prev, { role: "assistant", content: reply }])
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Connection issue. Try again." }])
    } finally {
      setLoading(false)
    }
  }

  const onKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send() }
  }

  const panelW = expanded ? Math.min(window.innerWidth - 48, 720) : size.w
  const panelH = expanded ? Math.min(window.innerHeight - 48, 860) : size.h
  const panelX = expanded ? (window.innerWidth  - panelW) / 2 : (pos.x ?? window.innerWidth  - panelW - 24)
  const panelY = expanded ? (window.innerHeight - panelH) / 2 : (pos.y ?? window.innerHeight - panelH - 24)

  if (!open) return (
    <button
      onClick={() => setOpen(true)}
      style={{
        position: "fixed", bottom: 24, right: 24, zIndex: 9999,
        width: 52, height: 52, borderRadius: "50%",
        background: ACCENT, border: "none", cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: "0 4px 20px rgba(0,0,0,0.4)"
      }}
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" fill="white"/>
      </svg>
    </button>
  )

  return (
    <div
      ref={containerRef}
      style={{
        position: "fixed",
        left: panelX, top: panelY,
        width: panelW, height: panelH,
        zIndex: 9999,
        display: "flex", flexDirection: "column",
        background: PANEL,
        border: `1px solid ${BORDER}`,
        borderRadius: 14,
        overflow: "hidden",
        fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif",
        fontSize: 14,
        color: TEXT,
        transition: dragging || resizing ? "none" : "left 0.15s, top 0.15s, width 0.15s, height 0.15s",
        userSelect: dragging ? "none" : "auto",
      }}
    >
      {/* Header — drag handle */}
      <div
        onMouseDown={onDragStart}
        style={{
          padding: "12px 16px",
          background: NAVY,
          borderBottom: `1px solid ${BORDER}`,
          display: "flex", alignItems: "center", gap: 10,
          cursor: dragging ? "grabbing" : "grab",
          flexShrink: 0,
        }}
      >
        {/* Logo mark */}
        <div style={{
          width: 28, height: 28, borderRadius: 7,
          background: ACCENT, display: "flex",
          alignItems: "center", justifyContent: "center", flexShrink: 0
        }}>
          <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="3" fill="white"/>
            <path d="M10 2v3M10 15v3M2 10h3M15 10h3" stroke="white" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 13, letterSpacing: "0.04em", color: TEXT }}>
            AIDE Intelligence
          </div>
          <div style={{ fontSize: 10, color: MUTED, marginTop: 1, display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: GREEN, display: "inline-block" }}/>
            Service Ops — Dry Fire Division
          </div>
        </div>

        {/* Controls */}
        <div style={{ display: "flex", gap: 6 }}>
          <HeaderBtn onClick={() => setExpanded(e => !e)} title={expanded ? "Restore" : "Expand"}>
            {expanded
              ? <CollapseIcon/>
              : <ExpandIcon/>
            }
          </HeaderBtn>
          <HeaderBtn onClick={() => setOpen(false)} title="Minimise">
            <MinusIcon/>
          </HeaderBtn>
        </div>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1, overflowY: "auto", padding: "16px 14px",
        display: "flex", flexDirection: "column", gap: 12,
        scrollbarWidth: "thin", scrollbarColor: `${BORDER} transparent`
      }}>
        {messages.map((msg, i) => (
          <MessageBubble key={i} msg={msg} accent={ACCENT} surface={SURFACE} border={BORDER} muted={MUTED} text={TEXT}/>
        ))}
        {loading && <TypingIndicator surface={SURFACE} border={BORDER} muted={MUTED} accent={ACCENT}/>}
        <div ref={bottomRef}/>
      </div>

      {/* Input */}
      <div style={{
        padding: "10px 12px",
        borderTop: `1px solid ${BORDER}`,
        background: NAVY,
        display: "flex", gap: 8, alignItems: "flex-end",
        flexShrink: 0,
      }}>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={onKey}
          placeholder="Type a message or paste an update..."
          rows={1}
          style={{
            flex: 1, resize: "none", border: `1px solid ${BORDER}`,
            borderRadius: 9, padding: "9px 12px",
            background: SURFACE, color: TEXT,
            fontSize: 13, lineHeight: 1.5, outline: "none",
            fontFamily: "inherit", maxHeight: 120, overflowY: "auto",
            scrollbarWidth: "thin",
          }}
          onInput={e => {
            e.target.style.height = "auto"
            e.target.style.height = Math.min(120, e.target.scrollHeight) + "px"
          }}
        />
        <button
          onClick={send}
          disabled={!input.trim() || loading}
          style={{
            width: 36, height: 36, borderRadius: 9, border: "none",
            background: input.trim() && !loading ? ACCENT : BORDER,
            cursor: input.trim() && !loading ? "pointer" : "default",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0, transition: "background 0.15s",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
            <path d="M4 10h12M11 5l5 5-5 5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      {/* Resize handle */}
      {!expanded && (
        <div
          onMouseDown={onResizeStart}
          style={{
            position: "absolute", bottom: 0, right: 0,
            width: 16, height: 16, cursor: "se-resize",
            display: "flex", alignItems: "flex-end", justifyContent: "flex-end",
            padding: 3
          }}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M9 1L1 9M5 1L1 5M9 5L5 9" stroke={MUTED} strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
        </div>
      )}
    </div>
  )
}

function MessageBubble({ msg, accent, surface, border, muted, text }) {
  const isUser = msg.role === "user"
  const content = msg.content

  return (
    <div style={{
      display: "flex",
      flexDirection: isUser ? "row-reverse" : "row",
      gap: 8, alignItems: "flex-start",
    }}>
      {!isUser && (
        <div style={{
          width: 24, height: 24, borderRadius: 6, background: accent,
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2
        }}>
          <svg width="11" height="11" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="3" fill="white"/>
            <path d="M10 2v3M10 15v3M2 10h3M15 10h3" stroke="white" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </div>
      )}

      <div style={{
        maxWidth: isUser ? "80%" : "88%",
        background: isUser ? accent : surface,
        border: isUser ? "none" : `1px solid ${border}`,
        borderRadius: isUser ? "12px 4px 12px 12px" : "4px 12px 12px 12px",
        padding: "9px 12px",
        fontSize: 13,
        lineHeight: 1.65,
        color: text,
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
      }}>
        <FormattedContent content={content} muted={muted} accent={accent} text={text} border={border}/>
      </div>
    </div>
  )
}

function FormattedContent({ content, muted, accent, text, border }) {
  const lines = content.split("\n")
  const elements = []
  let i = 0
  let tableLines = []
  let inTable = false

  while (i < lines.length) {
    const line = lines[i]

    // Detect table (lines starting with |)
    if (line.trim().startsWith("|")) {
      tableLines.push(line)
      inTable = true
      i++
      continue
    }

    // Flush table
    if (inTable && tableLines.length > 0) {
      elements.push(<InlineTable key={`tbl-${i}`} lines={tableLines} border={border} muted={muted} text={text}/>)
      tableLines = []
      inTable = false
    }

    // Code block
    if (line.startsWith("```")) {
      const codeLines = []
      i++
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i])
        i++
      }
      elements.push(
        <pre key={`code-${i}`} style={{
          background: "#0A1220", borderRadius: 6, padding: "8px 10px",
          fontSize: 11.5, lineHeight: 1.5, margin: "4px 0",
          overflowX: "auto", color: "#7DD3FC", fontFamily: "monospace"
        }}>
          {codeLines.join("\n")}
        </pre>
      )
      i++
      continue
    }

    // Empty line
    if (line.trim() === "") {
      elements.push(<div key={`sp-${i}`} style={{ height: 4 }}/>)
      i++; continue
    }

    // Heading
    if (line.startsWith("## ") || line.startsWith("### ")) {
      const lvl = line.startsWith("### ") ? 3 : 2
      const txt = line.replace(/^#{2,3} /, "")
      elements.push(
        <div key={`h-${i}`} style={{
          fontWeight: 700, fontSize: lvl === 2 ? 13 : 12,
          color: lvl === 2 ? accent : text,
          marginTop: 8, marginBottom: 2, letterSpacing: "0.03em"
        }}>
          {txt}
        </div>
      )
      i++; continue
    }

    // Render inline formatted line
    elements.push(<p key={`p-${i}`} style={{ margin: "1px 0" }}>{renderInline(line, text, accent)}</p>)
    i++
  }

  // Flush trailing table
  if (inTable && tableLines.length > 0) {
    elements.push(<InlineTable key="tbl-end" lines={tableLines} border={border} muted={muted} text={text}/>)
  }

  return <div>{elements}</div>
}

function renderInline(text, textColor, accent) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\⚠[^\s]+\s+[A-Z]+)/g)
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i} style={{ fontWeight: 700 }}>{part.slice(2,-2)}</strong>
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={i} style={{
          background: "#0A1220", borderRadius: 4, padding: "1px 5px",
          fontSize: 11, fontFamily: "monospace", color: "#7DD3FC"
        }}>
          {part.slice(1,-1)}
        </code>
      )
    }
    if (part.startsWith("⚠")) {
      return <span key={i} style={{ color: "#F59E0B", fontWeight: 600 }}>{part}</span>
    }
    if (part.startsWith("CRITICAL")) {
      return <span key={i} style={{ color: "#EF4444", fontWeight: 700 }}>{part}</span>
    }
    return part
  })
}

function InlineTable({ lines, border, muted, text }) {
  const rows = lines.filter(l => !l.match(/^\|[-| ]+\|$/))
  if (rows.length < 1) return null
  const headers = rows[0].split("|").filter(c => c.trim()).map(c => c.trim())
  const dataRows = rows.slice(1).map(r => r.split("|").filter(c => c.trim()).map(c => c.trim()))

  return (
    <div style={{ overflowX: "auto", margin: "6px 0", borderRadius: 7, border: `1px solid ${border}` }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th key={i} style={{
                padding: "6px 10px", textAlign: "left", fontWeight: 600,
                color: muted, borderBottom: `1px solid ${border}`,
                fontSize: 11, letterSpacing: "0.04em", whiteSpace: "nowrap",
                background: "#0F1C2E"
              }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {dataRows.map((row, ri) => (
            <tr key={ri} style={{ background: ri%2 === 0 ? "transparent" : "rgba(255,255,255,0.02)" }}>
              {row.map((cell, ci) => (
                <td key={ci} style={{
                  padding: "5px 10px", color: text,
                  borderBottom: ri < dataRows.length-1 ? `1px solid ${border}` : "none",
                  fontSize: 12
                }}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function TypingIndicator({ surface, border, muted, accent }) {
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
      <div style={{
        width: 24, height: 24, borderRadius: 6, background: accent,
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
      }}>
        <svg width="11" height="11" viewBox="0 0 20 20" fill="none">
          <circle cx="10" cy="10" r="3" fill="white"/>
          <path d="M10 2v3M10 15v3M2 10h3M15 10h3" stroke="white" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </div>
      <div style={{
        background: surface, border: `1px solid ${border}`,
        borderRadius: "4px 12px 12px 12px",
        padding: "10px 14px", display: "flex", gap: 5, alignItems: "center"
      }}>
        {[0,1,2].map(j => (
          <div key={j} style={{
            width: 5, height: 5, borderRadius: "50%", background: muted,
            animation: `pulse 1.2s ease-in-out ${j * 0.2}s infinite`
          }}/>
        ))}
      </div>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: scale(0.85); }
          50% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  )
}

function HeaderBtn({ onClick, children, title }) {
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={onClick}
      title={title}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: 26, height: 26, borderRadius: 6, border: "none",
        background: hov ? "rgba(255,255,255,0.1)" : "transparent",
        cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
        color: "#7A8999", transition: "background 0.1s"
      }}
    >
      {children}
    </button>
  )
}

const ExpandIcon   = () => <svg width="13" height="13" viewBox="0 0 20 20" fill="none"><path d="M3 8V3h5M17 12v5h-5M3 12v5h5M17 8V3h-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
const CollapseIcon = () => <svg width="13" height="13" viewBox="0 0 20 20" fill="none"><path d="M8 3v5H3M12 17v-5h5M3 12h5v5M17 8h-5V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
const MinusIcon    = () => <svg width="13" height="13" viewBox="0 0 20 20" fill="none"><path d="M4 10h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
