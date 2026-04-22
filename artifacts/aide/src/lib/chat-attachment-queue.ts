/**
 * Cross-route handoff for files dropped on the global AIDE tray that aren't
 * CSV/.msg. The tray's FileIntakeDialog only handles tabular intake; everything
 * else (PDFs, images, Word, Excel, etc.) belongs in the chat composer where the
 * full multimodal pipeline lives. The chat page is route-scoped, so when the
 * user drops on the tray from another route we need to (a) stash the File
 * objects in memory because they don't survive sessionStorage, and (b) navigate
 * to /chat and let chat.tsx drain the queue on mount.
 */

const queue: File[] = [];

export function enqueueChatFiles(files: File[]) {
  queue.push(...files);
}

export function drainChatFiles(): File[] {
  const out = queue.splice(0, queue.length);
  return out;
}

export function hasQueuedChatFiles(): boolean {
  return queue.length > 0;
}

export const CHAT_ATTACH_EVENT = "aide-attach-files-to-chat";
