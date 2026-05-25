import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import type { ParsedEvent } from "../parsers/events.js";

export type ExchangeMode = "text" | "json";

export interface ExportResult {
  success: boolean;
  file: string;
  mode: ExchangeMode;
  error?: string;
}

export interface PreparedImport {
  sourceFile: string;
  mode: ExchangeMode;
  newRaw: string; // minified single-line JSON to write back
}

export interface ImportResult {
  success: boolean;
  backupPath: string;
  error?: string;
}

function sanitize(s: string): string {
  return s.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 60) || "event";
}

export function downloadsDir(): string {
  return path.join(os.homedir(), "Downloads");
}

function baseName(event: ParsedEvent): string {
  return `event-${event.lineNumber}-${sanitize(event.type)}`;
}

// A message-like event (system/user) carries its body in data.content.
function contentString(event: ParsedEvent): string | null {
  const c = (event.data as Record<string, unknown>)?.content;
  return typeof c === "string" ? c : null;
}

// Messages round-trip as editable text; everything else as full-event JSON.
export function modeFor(event: ParsedEvent): ExchangeMode {
  return contentString(event) === null ? "json" : "text";
}

export function exportFilePath(event: ParsedEvent): string {
  const ext = modeFor(event) === "text" ? "txt" : "json";
  return path.join(downloadsDir(), `${baseName(event)}.${ext}`);
}

// Write the viewed event to Downloads. Deterministic name (overwrites) so the
// import step always knows which file to read back.
export function exportEvent(event: ParsedEvent): ExportResult {
  const mode = modeFor(event);
  const dir = downloadsDir();
  const file = exportFilePath(event);
  try {
    fs.mkdirSync(dir, { recursive: true });
    let text: string;
    if (mode === "text") {
      text = contentString(event) ?? "";
    } else {
      try {
        text = JSON.stringify(JSON.parse(event.raw), null, 2);
      } catch {
        text = event.raw;
      }
    }
    fs.writeFileSync(file, text, "utf-8");
    return { success: true, file, mode };
  } catch (err) {
    return { success: false, file, mode, error: err instanceof Error ? err.message : String(err) };
  }
}

// Locate the edited file for this event and build the replacement line.
export function prepareImport(event: ParsedEvent): PreparedImport | { error: string } {
  const dir = downloadsDir();
  const txt = path.join(dir, `${baseName(event)}.txt`);
  const json = path.join(dir, `${baseName(event)}.json`);
  const natural = modeFor(event);

  let sourceFile: string | null = null;
  let mode: ExchangeMode | null = null;
  if (natural === "text" && fs.existsSync(txt)) { sourceFile = txt; mode = "text"; }
  else if (natural === "json" && fs.existsSync(json)) { sourceFile = json; mode = "json"; }
  else if (fs.existsSync(txt)) { sourceFile = txt; mode = "text"; }
  else if (fs.existsSync(json)) { sourceFile = json; mode = "json"; }

  if (!sourceFile || !mode) {
    return { error: `No exported file found. Export first (expected ${path.basename(natural === "text" ? txt : json)} in Downloads).` };
  }

  let fileText: string;
  try {
    fileText = fs.readFileSync(sourceFile, "utf-8");
  } catch (err) {
    return { error: `Cannot read ${path.basename(sourceFile)}: ${err instanceof Error ? err.message : String(err)}` };
  }

  let newRaw: string;
  if (mode === "text") {
    // Re-inject the edited text into the original event's content field,
    // preserving every other field exactly as it was.
    let obj: Record<string, unknown> & { data?: Record<string, unknown> };
    try {
      obj = JSON.parse(event.raw);
    } catch {
      return { error: "Original event JSON is not parseable; cannot re-inject content." };
    }
    if (typeof obj.data !== "object" || obj.data === null) obj.data = {};
    obj.data.content = fileText.replace(/\r\n/g, "\n").replace(/\n$/, "");
    newRaw = JSON.stringify(obj);
  } else {
    // Full-event JSON: validate it is a single JSON object, then minify.
    let obj: unknown;
    try {
      obj = JSON.parse(fileText);
    } catch (err) {
      return { error: `${path.basename(sourceFile)} is not valid JSON: ${err instanceof Error ? err.message : String(err)}` };
    }
    if (typeof obj !== "object" || obj === null || Array.isArray(obj)) {
      return { error: "Imported JSON must be a single object representing one event." };
    }
    newRaw = JSON.stringify(obj);
  }

  return { sourceFile, mode, newRaw };
}

// Replace one line in events.jsonl, backing up the file first (timestamped if a
// .bak already exists), mirroring truncateEvents' safety behavior.
export function replaceEventLine(sessionDir: string, lineNumber: number, newRaw: string): ImportResult {
  const eventsPath = path.join(sessionDir, "events.jsonl");
  const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  let backupPath = eventsPath + ".bak";
  if (fs.existsSync(backupPath)) backupPath = eventsPath + `.bak-${ts}`;

  try {
    if (/[\r\n]/.test(newRaw)) {
      return { success: false, backupPath: "", error: "Replacement line contains newlines." };
    }
    const content = fs.readFileSync(eventsPath, "utf-8");
    const hadTrailingNewline = content.endsWith("\n");
    const lines = content.split("\n");
    const idx = lineNumber - 1;
    if (idx < 0 || idx >= lines.length) {
      return { success: false, backupPath: "", error: `Line ${lineNumber} is out of range (file has ${lines.length} lines).` };
    }
    fs.copyFileSync(eventsPath, backupPath);
    lines[idx] = newRaw;
    let output = lines.join("\n");
    if (hadTrailingNewline && !output.endsWith("\n")) output += "\n";
    fs.writeFileSync(eventsPath, output, "utf-8");
    return { success: true, backupPath };
  } catch (err) {
    return { success: false, backupPath, error: err instanceof Error ? err.message : String(err) };
  }
}
