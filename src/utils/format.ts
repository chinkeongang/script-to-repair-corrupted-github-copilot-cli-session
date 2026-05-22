import * as os from "node:os";
import * as path from "node:path";

/** Default Copilot session state directory */
export function getDefaultSessionDir(): string {
  const home = os.homedir();
  return path.join(home, ".copilot", "session-state");
}

/** Check if the terminal supports Unicode box-drawing */
export function supportsUnicode(): boolean {
  if (process.platform === "win32") {
    return (
      !!process.env.WT_SESSION || // Windows Terminal
      !!process.env.TERM_PROGRAM // VS Code, etc.
    );
  }
  return true;
}

/** Format bytes as human-readable */
export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** Format ISO date as short local string */
export function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-CA") + " " + d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}

/** Format token count with commas */
export function formatTokens(n: number): string {
  return n.toLocaleString();
}

/** Truncate string to max length with ellipsis */
export function truncStr(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + "…";
}
