import * as fs from "node:fs";
import * as path from "node:path";

export interface TruncateResult {
  success: boolean;
  backupPath: string;
  keptLines: number;
  removedLines: number;
  error?: string;
}

/**
 * Truncate events.jsonl to keep only the first `keepLines` lines.
 * Creates a timestamped backup before modifying.
 */
export function truncateEvents(
  sessionDir: string,
  keepLines: number
): TruncateResult {
  const eventsPath = path.join(sessionDir, "events.jsonl");

  // Generate backup path with timestamp to avoid overwriting previous backups
  const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  let backupPath = eventsPath + ".bak";
  if (fs.existsSync(backupPath)) {
    backupPath = eventsPath + `.bak-${ts}`;
  }

  try {
    // Backup
    fs.copyFileSync(eventsPath, backupPath);

    // Read all lines
    const content = fs.readFileSync(eventsPath, "utf-8");
    const lines = content.split("\n");

    // Keep only the first keepLines lines
    const kept = lines.slice(0, keepLines);
    const removedCount = lines.length - kept.length;

    // Ensure file ends with newline
    let output = kept.join("\n");
    if (!output.endsWith("\n")) output += "\n";

    fs.writeFileSync(eventsPath, output, "utf-8");

    return {
      success: true,
      backupPath,
      keptLines: keepLines,
      removedLines: removedCount,
    };
  } catch (err) {
    return {
      success: false,
      backupPath,
      keptLines: 0,
      removedLines: 0,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/** Get a breakdown of event types in a range of events */
export function getEventTypeBreakdown(
  events: { type: string }[],
  startIndex: number,
  endIndex: number
): Map<string, number> {
  const counts = new Map<string, number>();
  for (let i = startIndex; i < endIndex && i < events.length; i++) {
    const t = events[i].type;
    counts.set(t, (counts.get(t) ?? 0) + 1);
  }
  return counts;
}
