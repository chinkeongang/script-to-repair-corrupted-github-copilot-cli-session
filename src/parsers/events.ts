import * as fs from "node:fs";
import * as readline from "node:readline";
import * as path from "node:path";

export interface ParsedEvent {
  lineNumber: number;
  type: string;
  timestamp: string;
  id: string;
  parentId: string | null;
  data: Record<string, unknown>;
  raw: string;
}

/** Parse all events from events.jsonl. Loads full file into memory. */
export function parseEventsSync(sessionDir: string): ParsedEvent[] {
  const eventsPath = path.join(sessionDir, "events.jsonl");
  if (!fs.existsSync(eventsPath)) return [];

  const content = fs.readFileSync(eventsPath, "utf-8");
  const lines = content.split("\n");
  const events: ParsedEvent[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    try {
      const obj = JSON.parse(line);
      events.push({
        lineNumber: i + 1,
        type: obj.type ?? "unknown",
        timestamp: obj.timestamp ?? "",
        id: obj.id ?? "",
        parentId: obj.parentId ?? null,
        data: obj.data ?? {},
        raw: line,
      });
    } catch {
      // Skip malformed lines
    }
  }
  return events;
}

/** Get event count and file size without parsing all events */
export function getEventsStats(sessionDir: string): { count: number; size: number } {
  const eventsPath = path.join(sessionDir, "events.jsonl");
  if (!fs.existsSync(eventsPath)) return { count: 0, size: 0 };

  const stat = fs.statSync(eventsPath);
  const content = fs.readFileSync(eventsPath, "utf-8");
  const count = content.split("\n").filter((l) => l.trim().length > 0).length;
  return { count, size: stat.size };
}

/** Count errors in the events */
export function countErrors(events: ParsedEvent[]): number {
  return events.filter((e) => e.type === "session.error").length;
}

/** Check if session has a shutdown event */
export function hasShutdown(events: ParsedEvent[]): boolean {
  return events.some((e) => e.type === "session.shutdown");
}

/** Get a summary line for an event */
export function summarizeEvent(evt: ParsedEvent): string {
  const data = evt.data;
  switch (evt.type) {
    case "session.start":
      return `Session started (v${data.copilotVersion ?? "?"})`;
    case "session.model_change":
      return `Model: ${data.newModel ?? "?"}`;
    case "session.resume":
      return `Resumed (${data.eventCount ?? "?"} events)`;
    case "session.shutdown":
      return `Shutdown (${data.shutdownType ?? "?"})`;
    case "session.error":
      return String(data.message ?? "").slice(0, 80);
    case "user.message": {
      const content = String(data.content ?? "").slice(0, 60);
      const att = Array.isArray(data.attachments) ? data.attachments : [];
      const attStr = att.length > 0 ? ` [${att.length} attachment${att.length > 1 ? "s" : ""}]` : "";
      return content + attStr;
    }
    case "assistant.message": {
      const tokens = data.outputTokens ?? 0;
      const tools = Array.isArray(data.toolRequests) ? data.toolRequests : [];
      const toolNames = tools.map((t: Record<string, unknown>) => t.name).slice(0, 3).join(", ");
      return `${tokens} tokens${toolNames ? ` → ${toolNames}` : ""}`;
    }
    case "tool.execution_start": {
      const toolName = String(data.toolName ?? "?");
      return toolName;
    }
    case "tool.execution_complete": {
      const success = data.success ? "✔" : "✘";
      return success;
    }
    case "session.compaction_start":
      return `${data.conversationTokens ?? 0} conv tokens`;
    case "session.compaction_complete":
      return `Checkpoint #${data.checkpointNumber ?? "?"}`;
    case "permission.requested": {
      const pr = data.permissionRequest as Record<string, unknown> | undefined;
      return String(pr?.intention ?? "").slice(0, 60);
    }
    case "permission.completed": {
      const result = data.result as Record<string, unknown> | undefined;
      return String(result?.kind ?? "?");
    }
    case "subagent.started":
      return String(data.agentName ?? "?");
    case "subagent.completed": {
      const dur = Number(data.durationMs ?? 0);
      return `${data.agentName ?? "?"} (${(dur / 1000).toFixed(1)}s)`;
    }
    case "abort":
      return String(data.reason ?? "");
    case "system.message":
      return `${String(data.content ?? "").length} chars`;
    case "system.notification":
      return String((data.kind as Record<string, unknown>)?.type ?? "");
    default:
      return "";
  }
}
