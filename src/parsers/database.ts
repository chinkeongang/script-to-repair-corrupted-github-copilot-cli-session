import * as fs from "node:fs";
import * as path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

export interface TableInfo {
  name: string;
  sql: string;
  rowCount: number;
  columns: ColumnInfo[];
}

export interface ColumnInfo {
  name: string;
  type: string;
  notnull: boolean;
  pk: boolean;
  defaultValue: string | null;
}

/** Read database schema info using a dynamically imported better-sqlite3 */
export function parseDatabaseSync(sessionDir: string): TableInfo[] {
  const dbPath = path.join(sessionDir, "session.db");
  if (!fs.existsSync(dbPath)) return [];

  try {
    const Database = require("better-sqlite3");
    const db = new Database(dbPath, { readonly: true });

    const tables: TableInfo[] = [];

    const tableRows = db
      .prepare("SELECT name, sql FROM sqlite_master WHERE type='table' ORDER BY name")
      .all() as { name: string; sql: string }[];

    for (const row of tableRows) {
      const countRow = db.prepare(`SELECT COUNT(*) as cnt FROM [${row.name}]`).get() as { cnt: number };
      const colRows = db.prepare(`PRAGMA table_info([${row.name}])`).all() as {
        name: string;
        type: string;
        notnull: number;
        pk: number;
        dflt_value: string | null;
      }[];

      tables.push({
        name: row.name,
        sql: row.sql,
        rowCount: countRow.cnt,
        columns: colRows.map((c) => ({
          name: c.name,
          type: c.type,
          notnull: c.notnull === 1,
          pk: c.pk === 1,
          defaultValue: c.dflt_value,
        })),
      });
    }

    db.close();
    return tables;
  } catch {
    // better-sqlite3 not available or DB error
    return [];
  }
}
