// server/api/chat.js — Replit Express API route
// Proxies requests to Anthropic API. API key stays server-side only.
// Usage: POST /api/chat  { messages: [...], system: "..." }

const express = require("express")
const router  = express.Router()

router.post("/chat", async (req, res) => {
  const { messages, system } = req.body

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "messages array required" })
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type":         "application/json",
        "x-api-key":            process.env.ANTHROPIC_API_KEY,
        "anthropic-version":    "2023-06-01",
      },
      body: JSON.stringify({
        model:      "claude-sonnet-4-6",
        max_tokens: 2048,
        system:     system ?? "",
        messages:   messages.map(m => ({
          role:    m.role,
          content: m.content
        }))
      })
    })

    if (!response.ok) {
      const err = await response.text()
      console.error("Anthropic API error:", err)
      return res.status(502).json({ error: "API error" })
    }

    const data = await response.json()
    return res.json(data)

  } catch (err) {
    console.error("Server error:", err)
    return res.status(500).json({ error: "Server error" })
  }
})

module.exports = router
