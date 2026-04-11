import type { Response } from "express";

// Simple SSE event bus for real-time dashboard updates
const clients = new Set<Response>();

export function addSSEClient(res: Response) {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.write(`data: ${JSON.stringify({ type: "connected" })}\n\n`);
  clients.add(res);
  res.on("close", () => clients.delete(res));
}

export function broadcastEvent(type: string, data?: any) {
  const msg = `data: ${JSON.stringify({ type, data, ts: Date.now() })}\n\n`;
  for (const client of clients) {
    try { client.write(msg); } catch { clients.delete(client); }
  }
}

export function getClientCount() { return clients.size; }
