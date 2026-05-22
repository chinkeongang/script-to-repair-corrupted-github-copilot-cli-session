# AGENTS.md

## Project overview
- TUI tool for browsing, inspecting, and repairing GitHub Copilot CLI session databases
- Browse sessions, view events/checkpoints/database/metadata, truncate events to repair broken sessions
- DOSShell-style interface matching ifwi-browser design patterns
- Built with Ink v5 (React for terminals)

## Tech stack
- **Runtime**: Node.js 22+
- **Language**: TypeScript (strict mode)
- **TUI**: Ink v5 (React for terminals), React 18
- **CLI**: Commander
- **SQLite**: better-sqlite3 (sync API)
- **Dev runner**: tsx
- **Build**: tsup (production bundle)

## Commands
```bash
# Type-check
npx tsc --noEmit

# Run (dev mode)
npx tsx src/index.tsx
session-repair.bat                    # Windows
./session-repair.sh                   # Linux

# Run with args
npx tsx src/index.tsx --dir D:\copilot
npx tsx src/index.tsx --session b29e8d91-43f8-4875-bef6-7af869f8d16c
```

## Conventions
- Entry point: `src/index.tsx` → `src/app.tsx`
- Parsers: `src/parsers/` — read session data files (events.jsonl, workspace.yaml, checkpoints, session.db)
- Repair logic: `src/repair/` — truncate events, edit workspace, manage checkpoints
- Components: `src/components/` — one per file, Ink v5 components
- Utils: `src/utils/` — formatting, event classification, platform helpers

## Gotchas
- **Ink v5.2.1 has no `fullScreen` option** — manually enter/exit alternate screen buffer with ANSI escapes
- **events.jsonl can be 7+ MB** — full parse loads into memory; for listing only, use getEventsStats()
- **better-sqlite3 requires native compilation** — may need node-gyp build tools
- **Event parentId tree** — session.start is root (parentId=null), all others chain from it
- **workspace.yaml is flat key-value** — no nesting, no quoting, simple colon-separated
- **Backup before any write** — always create .bak before modifying events.jsonl
- **Checkpoint XML tags** — sections use `<tagname>...</tagname>` format, not standard XML

## Don't do this
- Don't modify events.jsonl without creating a backup first
- Don't truncate before the first session.start event
- Don't change workspace.yaml `id` without renaming the directory
- Don't use `--loader tsx/esm` — use `--import tsx/esm` or just `tsx` directly
- Don't use Ink `fullScreen: true` — not in v5.2.1
