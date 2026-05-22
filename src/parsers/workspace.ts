import * as fs from "node:fs";
import * as path from "node:path";

export interface WorkspaceInfo {
  id: string;
  cwd: string;
  name: string;
  user_named: boolean;
  summary_count: number;
  created_at: string;
  updated_at: string;
  [key: string]: string | number | boolean;
}

export function parseWorkspace(sessionDir: string): WorkspaceInfo | null {
  const wsPath = path.join(sessionDir, "workspace.yaml");
  if (!fs.existsSync(wsPath)) return null;

  const content = fs.readFileSync(wsPath, "utf-8");
  const result: Record<string, string | number | boolean> = {};

  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || !trimmed.includes(":")) continue;
    const colonIdx = trimmed.indexOf(":");
    const key = trimmed.slice(0, colonIdx).trim();
    let val: string | number | boolean = trimmed.slice(colonIdx + 1).trim();

    if (val === "true") val = true;
    else if (val === "false") val = false;
    else if (/^\d+$/.test(val)) val = parseInt(val, 10);

    result[key] = val;
  }

  return {
    id: String(result.id ?? ""),
    cwd: String(result.cwd ?? ""),
    name: String(result.name ?? "Unnamed Session"),
    user_named: Boolean(result.user_named ?? false),
    summary_count: Number(result.summary_count ?? 0),
    created_at: String(result.created_at ?? ""),
    updated_at: String(result.updated_at ?? ""),
    ...result,
  };
}

export function writeWorkspace(sessionDir: string, info: WorkspaceInfo): void {
  const wsPath = path.join(sessionDir, "workspace.yaml");
  const lines: string[] = [];
  for (const [key, val] of Object.entries(info)) {
    lines.push(`${key}: ${val}`);
  }
  // Ensure trailing newline
  fs.writeFileSync(wsPath, lines.join("\n") + "\n", "utf-8");
}
