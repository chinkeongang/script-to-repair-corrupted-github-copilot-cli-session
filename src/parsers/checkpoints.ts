import * as fs from "node:fs";
import * as path from "node:path";

export interface CheckpointInfo {
  number: number;
  filename: string;
  title: string;
  size: number;
  overview: string;
  sections: Record<string, string>;
}

/** Parse checkpoint index and individual files */
export function parseCheckpoints(sessionDir: string): CheckpointInfo[] {
  const cpDir = path.join(sessionDir, "checkpoints");
  if (!fs.existsSync(cpDir)) return [];

  const files = fs.readdirSync(cpDir).filter(
    (f) => f.endsWith(".md") && f !== "index.md"
  );
  files.sort();

  const checkpoints: CheckpointInfo[] = [];

  for (const fname of files) {
    const fpath = path.join(cpDir, fname);
    const content = fs.readFileSync(fpath, "utf-8");
    const stat = fs.statSync(fpath);

    // Extract number from filename (001-xxx.md → 1)
    const numMatch = fname.match(/^(\d+)-/);
    const num = numMatch ? parseInt(numMatch[1], 10) : 0;

    // Extract title from filename (001-some-title.md → some title)
    const titleMatch = fname.match(/^\d+-(.*?)\.md$/);
    const title = titleMatch ? titleMatch[1].replace(/-/g, " ") : fname;

    // Parse XML-tagged sections
    const sections: Record<string, string> = {};
    let currentTag: string | null = null;
    const currentContent: string[] = [];

    for (const line of content.split("\n")) {
      const openMatch = line.match(/^<(\w+)>/);
      const closeMatch = line.match(/^<\/(\w+)>/);

      if (openMatch && !closeMatch) {
        currentTag = openMatch[1];
        currentContent.length = 0;
      } else if (closeMatch && currentTag === closeMatch[1]) {
        sections[currentTag] = currentContent.join("\n");
        currentTag = null;
      } else if (currentTag) {
        currentContent.push(line);
      }
    }

    checkpoints.push({
      number: num,
      filename: fname,
      title,
      size: stat.size,
      overview: (sections.overview ?? "").trim().slice(0, 200),
      sections,
    });
  }

  return checkpoints;
}
