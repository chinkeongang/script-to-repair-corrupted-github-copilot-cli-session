export type EventCategory =
  | "lifecycle"
  | "message"
  | "turn"
  | "tool"
  | "hook"
  | "compaction"
  | "permission"
  | "subagent"
  | "error";

export interface EventCategoryInfo {
  category: EventCategory;
  color: string;
  icon: string;
}

const EVENT_MAP: Record<string, EventCategoryInfo> = {
  "session.start":              { category: "lifecycle",  color: "blue",         icon: "🚀" },
  "session.shutdown":           { category: "lifecycle",  color: "blue",         icon: "🛑" },
  "session.resume":             { category: "lifecycle",  color: "blue",         icon: "▶️" },
  "session.model_change":       { category: "lifecycle",  color: "blue",         icon: "🔄" },
  "session.compaction_start":   { category: "compaction", color: "yellow",       icon: "📦" },
  "session.compaction_complete":{ category: "compaction", color: "yellow",       icon: "📦" },
  "session.truncation":         { category: "compaction", color: "yellow",       icon: "✂️" },
  "session.error":              { category: "error",      color: "red",          icon: "❌" },
  "user.message":               { category: "message",    color: "cyan",         icon: "👤" },
  "assistant.message":          { category: "message",    color: "green",        icon: "🤖" },
  "assistant.turn_start":       { category: "turn",       color: "gray",         icon: "⏵" },
  "assistant.turn_end":         { category: "turn",       color: "gray",         icon: "⏹" },
  "system.message":             { category: "message",    color: "magenta",      icon: "📋" },
  "system.notification":        { category: "message",    color: "magenta",      icon: "🔔" },
  "tool.execution_start":       { category: "tool",       color: "greenBright",  icon: "🔧" },
  "tool.execution_complete":    { category: "tool",       color: "greenBright",  icon: "🔧" },
  "hook.start":                 { category: "hook",       color: "gray",         icon: "⚓" },
  "hook.end":                   { category: "hook",       color: "gray",         icon: "⚓" },
  "permission.requested":       { category: "permission", color: "yellowBright", icon: "🔐" },
  "permission.completed":       { category: "permission", color: "yellowBright", icon: "🔐" },
  "subagent.started":           { category: "subagent",   color: "cyanBright",   icon: "🧠" },
  "subagent.completed":         { category: "subagent",   color: "cyanBright",   icon: "🧠" },
  "abort":                      { category: "error",      color: "red",          icon: "⛔" },
};

const DEFAULT_INFO: EventCategoryInfo = {
  category: "lifecycle",
  color: "white",
  icon: "•",
};

export function classifyEvent(type: string): EventCategoryInfo {
  return EVENT_MAP[type] ?? DEFAULT_INFO;
}

export const ALL_CATEGORIES: EventCategory[] = [
  "lifecycle",
  "message",
  "turn",
  "tool",
  "hook",
  "compaction",
  "permission",
  "subagent",
  "error",
];

export const CATEGORY_LABELS: Record<EventCategory, string> = {
  lifecycle: "Lifecycle",
  message: "Message",
  turn: "Turn",
  tool: "Tool",
  hook: "Hook",
  compaction: "Compaction",
  permission: "Permission",
  subagent: "Subagent",
  error: "Error",
};
