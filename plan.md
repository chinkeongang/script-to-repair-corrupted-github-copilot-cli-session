# Copilot Session Repair Tool — Design Plan

> A DOSShell-style TUI tool for browsing, inspecting, and repairing GitHub Copilot CLI session databases.
> Built with the same **Ink v5 + React + TypeScript** stack as `ifwi-browser`.

---

## 1. Problem Statement

GitHub Copilot CLI sessions are stored as local file bundles (`events.jsonl`, `session.db`, `workspace.yaml`, `checkpoints/`). When a session breaks — e.g., an unsupported image attachment causes API errors, or a compaction goes wrong — there is **no official tool** to inspect or repair the session data. Users must manually parse JSON, edit SQLite, and guess which events to remove.

This tool provides a safe, visual, undo-able way to:
- Browse all local sessions
- Inspect events, checkpoints, todos, and metadata
- Revert a session to a prior state by truncating events
- Edit workspace metadata
- Manage checkpoints

---

## 2. Design Principles (from ifwi-browser)

| Principle | Implementation |
|---|---|
| **DOSShell-style TUI** | Ink v5 full-screen alternate buffer, box-drawing dividers, keyboard-driven navigation |
| **Component composition** | Header → main content area → detail panel → status bar |
| **Modal stacking** | Modes override key handlers (browse → event detail → confirm dialog) |
| **Controlled selection** | Parent owns `selectedIndex`, child renders + handles keys |
| **Platform-safe** | `supportsUnicode()` detection, Windows-compatible paths |
| **Non-destructive** | Auto-backup before any write operation |

---

## 3. Feature Specification

### 3.1 Session Browser (Home Screen)
- Scans `~/.copilot/session-state/` (or `--dir` override) for session directories
- Lists sessions with: name, ID (truncated), date, event count, status (has shutdown? has errors?)
- Sort by last updated (most recent first)
- Arrow keys to navigate, Enter to open, `q` to quit

### 3.2 Session Detail View
- **Header**: session name, full ID, cwd, created/updated dates
- **Tab-like sections** (press `1`-`5` to switch):
  1. **Events** — scrollable event list with type/timestamp/summary
  2. **Checkpoints** — list checkpoint files, view contents
  3. **Database** — browse session.db tables (todos, inbox_entries)
  4. **Metadata** — workspace.yaml fields (editable)
  5. **Repair Actions** — guided repair wizards

### 3.3 Event Browser
- Scrollable list of all events from `events.jsonl`
- Color-coded by category (lifecycle=blue, tool=green, error=red, message=cyan)
- **Filter bar** (ifwi-browser style): filter by event type category
- **Search**: press `/` to search event content
- **Detail view**: Enter on any event shows full JSON in a scrollable viewer (JsonViewer pattern)
- **Mark for truncation**: press `t` on an event to set a "truncate here" marker
- **User message markers**: user.message events highlighted with `>>` prefix for easy spotting

### 3.4 Repair: Revert / Truncate Events
- User navigates to an event and presses `t` to mark truncation point
- Shows a confirmation screen:
  ```
  ┌─────────────────────────────────────────────┐
  │  ⚠️  Truncate Session Events                │
  │                                             │
  │  Keep events:    1 – 2622                   │
  │  Remove events:  2623 – 2638 (16 events)    │
  │                                             │
  │  Events to remove:                          │
  │    • 3× user.message                        │
  │    • 3× session.error                       │
  │    • 3× system.message                      │
  │    • 3× assistant.turn_start                │
  │    • 3× assistant.turn_end                  │
  │    • 1× session.shutdown                    │
  │                                             │
  │  Last kept event:                           │
  │    assistant.turn_end [2026-05-22T03:29:10]  │
  │                                             │
  │  A backup will be saved as events.jsonl.bak │
  │                                             │
  │  [Enter] Confirm    [Esc] Cancel            │
  └─────────────────────────────────────────────┘
  ```
- On confirm: backs up original → writes truncated file → updates status

### 3.5 Repair: Edit Workspace Metadata
- Inline editing of `workspace.yaml` fields
- Fields shown with safety badges: ✅ Safe / ⚠️ Caution / 🔴 Dangerous
- Tab between fields, Enter to edit, Esc to cancel

### 3.6 Repair: Manage Checkpoints
- View checkpoint list with overview text
- View individual checkpoint content (scrollable)
- Edit checkpoint XML sections (opens in scrollable editor)
- Delete checkpoints (with warning + workspace.yaml sync)

### 3.7 Database Browser
- List tables in session.db
- Show table schema and row count
- Browse rows with scrollable table view
- Add/edit/delete todo rows via inline form
- Add inbox_entries for notification injection

---

## 4. Architecture

### 4.1 Project Structure

```
session-repair/
├── session-repair.bat        # Windows launcher
├── session-repair.sh         # Linux launcher
├── package.json
├── tsconfig.json
├── AGENTS.md
├── README.md
└── src/
    ├── index.tsx             # CLI entry (Commander, alt screen, args)
    ├── app.tsx               # Root component — session list + navigation
    │
    ├── parsers/
    │   ├── events.ts         # Parse events.jsonl (streaming line reader)
    │   ├── workspace.ts      # Parse/write workspace.yaml
    │   ├── checkpoints.ts    # Parse checkpoint .md files
    │   └── database.ts       # SQLite reader (better-sqlite3 sync API)
    │
    ├── repair/
    │   ├── truncate.ts       # Truncate events.jsonl with backup
    │   ├── workspace-edit.ts # Edit workspace.yaml fields
    │   └── checkpoint-edit.ts# Edit/delete checkpoint files
    │
    ├── components/
    │   ├── Header.tsx         # App header with breadcrumb + session info
    │   ├── SessionList.tsx    # Home screen: list of sessions
    │   ├── SessionRow.tsx     # Single session row
    │   ├── TabBar.tsx         # Section tab selector (1-5 keys)
    │   ├── EventList.tsx      # Scrollable event list with filtering
    │   ├── EventRow.tsx       # Single event row (color-coded)
    │   ├── EventDetail.tsx    # Full JSON viewer for one event
    │   ├── EventFilterBar.tsx # Filter chips for event types
    │   ├── CheckpointList.tsx # Checkpoint browser
    │   ├── CheckpointViewer.tsx # Scrollable checkpoint content
    │   ├── DatabaseBrowser.tsx# SQLite table browser
    │   ├── MetadataEditor.tsx # workspace.yaml field editor
    │   ├── TruncateConfirm.tsx# Confirmation dialog for truncation
    │   ├── StatusBar.tsx      # Bottom status bar with keybindings
    │   ├── ConfirmDialog.tsx  # Generic yes/no confirmation modal
    │   └── ScrollableText.tsx # Reusable scrollable text viewer
    │
    └── utils/
        ├── platform.ts       # Cross-platform helpers (from ifwi-browser)
        ├── event-classify.ts # Event type → category + color mapping
        └── format.ts         # Date, size, token count formatting
```

### 4.2 Screen Flow

```
┌──────────────────┐
│  Session List     │  Home screen — lists all sessions
│  (SessionList)    │
└────────┬─────────┘
         │ Enter
         ▼
┌──────────────────┐
│  Session Detail   │  Tab bar: Events | Checkpoints | DB | Meta | Repair
│  (App sub-view)   │
└────┬───┬───┬─────┘
     │   │   │
     ▼   ▼   ▼
  Events  Checkpoints  Database  Metadata  Repair
   │         │           │          │         │
   │ Enter   │ Enter     │ Enter    │ Enter   │ Enter
   ▼         ▼           ▼          ▼         ▼
 EventDetail CheckpointViewer TableView FieldEdit TruncateConfirm
 (JSON view) (scrollable md)  (rows)   (inline)  (confirm dialog)
```

### 4.3 State Management

```typescript
// Root state (app.tsx)
interface AppState {
  // Navigation
  screen: 'session-list' | 'session-detail';
  selectedSessionIndex: number;
  sessions: SessionInfo[];

  // Session detail
  activeTab: 'events' | 'checkpoints' | 'database' | 'metadata' | 'repair';
  
  // Event browser
  events: ParsedEvent[];
  eventSelectedIndex: number;
  eventTypeFilter: Set<string>;
  eventSearchQuery: string;
  truncateMarker: number | null;  // line number to truncate at
  
  // Modals
  modal: null | 'event-detail' | 'truncate-confirm' | 'checkpoint-view' | 'field-edit';
}
```

### 4.4 Key Dependencies

| Package | Purpose | Matches ifwi-browser? |
|---|---|---|
| `ink` v5 | TUI framework (React for terminals) | ✅ Same |
| `react` 18 | Component model | ✅ Same |
| `commander` | CLI argument parsing | ✅ Same |
| `better-sqlite3` | Sync SQLite access for session.db | New (needed) |
| `tsx` | Dev runner | ✅ Same |
| `tsup` | Production build | ✅ Same |
| `typescript` 6 | Language | ✅ Same |

---

## 5. Component Design Details

### 5.1 SessionList (Home Screen)

```
 Copilot Session Repair Tool  v1.0.0
 Scanning: C:\Users\cang1\.copilot\session-state\
 Found 12 sessions
────────────────────────────────────────────────────────────────
▸ 📂 Generate EDID-Less Report          b29e8d91  2026-05-22  ⚠️ 3 errors
  📂 Fix Authentication Module           a1c3f2e0  2026-05-21  ✔ clean
  📂 Create REST API                     7f8b2c91  2026-05-20  ✔ clean
  📂 Debug CSS Layout                    d4e5f6a7  2026-05-19  ⚠️ 1 error
────────────────────────────────────────────────────────────────
 Session: Generate EDID-Less Report
 ID:      b29e8d91-43f8-4875-bef6-7af869f8d16c
 CWD:     D:\gop
 Events:  2638    Errors: 3    Checkpoints: 5
────────────────────────────────────────────────────────────────
 ↑↓ Navigate  Enter Open  r Refresh  q Quit
```

**Keyboard**: Up/Down navigate, Enter opens session detail, `q` quits, `r` refreshes

### 5.2 EventList (Event Browser Tab)

```
 Session: Generate EDID-Less Report  │  Events (2638)  │  Filter: All
────────────────────────────────────────────────────────────────
 🔍 Filters                                     [f: edit filters]
   Category  [✔ Lifecycle] [✔ Message] [✔ Tool] [✔ Error] [✔ Hook]
   Showing 2638/2638 events
────────────────────────────────────────────────────────────────
  2620  🔧 assistant.turn_end              03:28:58   turn_end
  2621  🔧 assistant.turn_start            03:28:58   turn_start
  2622  💬 assistant.message               03:29:10   (482 tokens)
▸ 2623  📋 system.message                  03:31:49   system prompt
  2624  👤 user.message                    03:31:49   [📷 copilot-image...]  ⚠️
  2625  🔧 assistant.turn_start            03:31:50
  2626  🔧 assistant.turn_end              03:31:56
  2627  ❌ session.error                   03:31:56   vision not enabled
────────────────────────────────────────────────────────────────
 Event #2623: system.message
 Timestamp: 2026-05-22T03:31:49.437Z
 Parent: 9509bdf4...
────────────────────────────────────────────────────────────────
 ↑↓ Navigate  Enter View JSON  t Truncate here  / Search  f Filter
 1 Events  2 Checkpoints  3 Database  4 Metadata  5 Repair
```

**Keyboard**: Up/Down/PgUp/PgDn navigate, Enter views full JSON, `t` marks truncation point, `/` search, `f` filter mode, `1`-`5` switch tabs

### 5.3 TruncateConfirm (Modal Dialog)

Rendered as a centered box overlay (same pattern as ifwi-browser's DownloadPrompt). Shows:
- Keep range / remove range
- Breakdown of removed event types
- Last kept event info
- Backup file path
- Enter to confirm, Esc to cancel

### 5.4 Event Color Scheme

```typescript
const EVENT_COLORS: Record<string, string> = {
  'session.start':              'blue',
  'session.shutdown':           'blue',
  'session.resume':             'blue',
  'session.model_change':       'blue',
  'session.compaction_start':   'yellow',
  'session.compaction_complete':'yellow',
  'session.truncation':         'yellow',
  'session.error':              'red',
  'user.message':               'cyan',
  'assistant.message':          'green',
  'assistant.turn_start':       'gray',
  'assistant.turn_end':         'gray',
  'system.message':             'magenta',
  'system.notification':        'magenta',
  'tool.execution_start':       'greenBright',
  'tool.execution_complete':    'greenBright',
  'hook.start':                 'gray',
  'hook.end':                   'gray',
  'permission.requested':       'yellowBright',
  'permission.completed':       'yellowBright',
  'subagent.started':           'cyanBright',
  'subagent.completed':         'cyanBright',
  'abort':                      'red',
};
```

---

## 6. Repair Operations

### 6.1 Truncate Events (Primary Repair)

**Algorithm:**
1. User marks a truncation point (event N) in the event list
2. Tool calculates: keep lines 1–N, remove lines (N+1)–end
3. Confirmation dialog shows impact summary
4. On confirm:
   a. Copy `events.jsonl` → `events.jsonl.bak` (timestamped if .bak exists)
   b. Read file, keep first N lines, write back
   c. If a `session.shutdown` event was among the removed events, the session becomes resumable
   d. Show success message with backup location

**Edge cases:**
- If truncation removes compaction events, warn that `summary_count` in workspace.yaml may need updating
- If truncation point is before a `session.resume`, warn about cross-session state
- Never truncate before the first `session.start` event

### 6.2 Edit Workspace Metadata

**Editable fields:**
| Field | Edit UI | Validation |
|---|---|---|
| `name` | Text input | Non-empty string |
| `cwd` | Text input | Valid path (warn if doesn't exist) |
| `summary_count` | Number input | Must be ≥ 0, warn if ≠ checkpoint count |
| `user_named` | Toggle | true/false |
| `created_at` | Text input | ISO 8601 format |
| `updated_at` | Text input | ISO 8601 format |

**Algorithm:**
1. Read workspace.yaml → show fields with current values
2. User tabs between fields, Enter to edit inline
3. On save: backup original → write new yaml → show diff

### 6.3 Manage Checkpoints

**Operations:**
- View: read checkpoint .md, render in ScrollableText viewer
- Edit: open in simplified text editor (cursor-based editing is complex; V1 can open in $EDITOR)
- Delete: remove file + update index.md + decrement summary_count
- Reindex: regenerate index.md from actual checkpoint files

---

## 7. CLI Interface

```
session-repair [options]

Options:
  --dir <path>     Session state directory
                   (default: ~/.copilot/session-state/)
  --session <id>   Open a specific session by UUID directly
  --version        Show version
  --help           Show help

Examples:
  session-repair
  session-repair --dir D:\copilot
  session-repair --session b29e8d91-43f8-4875-bef6-7af869f8d16c
```

---

## 8. Implementation Phases

### Phase 1: Core Infrastructure (MVP)
- [ ] Project scaffolding (package.json, tsconfig, launchers)
- [ ] CLI entry point with Commander
- [ ] Session directory scanner (parsers/workspace.ts)
- [ ] Events parser (parsers/events.ts) — streaming line reader
- [ ] SessionList component (home screen)
- [ ] Header, StatusBar, ScrollableText components
- [ ] Basic session detail view with event list

### Phase 2: Event Browser + Truncation
- [ ] EventList with color-coded rows
- [ ] EventFilterBar (filter by category)
- [ ] EventDetail (JSON viewer, reuse JsonViewer pattern)
- [ ] Truncate marker + TruncateConfirm dialog
- [ ] repair/truncate.ts — backup + truncate logic
- [ ] Search events (`/` key)

### Phase 3: Metadata + Checkpoints
- [ ] TabBar component for section switching
- [ ] MetadataEditor (workspace.yaml inline editing)
- [ ] CheckpointList + CheckpointViewer
- [ ] repair/workspace-edit.ts, repair/checkpoint-edit.ts

### Phase 4: Database Browser
- [ ] better-sqlite3 integration
- [ ] DatabaseBrowser component (table list → row browser)
- [ ] Inline todo add/edit/delete
- [ ] Inbox entry injection

### Phase 5: Polish
- [ ] Cross-platform testing (Windows + Linux)
- [ ] Error handling edge cases
- [ ] README.md with screenshots
- [ ] AGENTS.md with gotchas

---

## 9. Key Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| TUI framework | Ink v5 + React | Matches ifwi-browser; proven cross-platform; component model |
| SQLite library | better-sqlite3 | Synchronous API avoids async complexity in TUI; well-maintained |
| Event parsing | Streaming line reader | events.jsonl can be 7+ MB; don't load all into memory for listing |
| Backup strategy | `.bak` with timestamp suffix | Multiple repair attempts shouldn't overwrite each other |
| Alternate screen | Manual ANSI escape | Ink v5.2.1 lacks fullScreen; same workaround as ifwi-browser |
| Checkpoint editing | $EDITOR fallback in V1 | Full in-TUI text editing is complex; defer to Phase 5 |

---

## 10. Event Type Reference (for classifier)

```
Session lifecycle:  session.start, session.model_change, session.resume, session.shutdown
Messages:           user.message, assistant.message, system.message, system.notification
Turns:              assistant.turn_start, assistant.turn_end
Tool execution:     tool.execution_start, tool.execution_complete
Hooks:              hook.start, hook.end
Compaction:         session.compaction_start, session.compaction_complete, session.truncation
Permissions:        permission.requested, permission.completed
Sub-agents:         subagent.started, subagent.completed
Errors:             session.error, abort
```

Each event has: `{ type, data, id, timestamp, parentId }`.
Key join fields: `interactionId`, `turnId`, `toolCallId`, `hookInvocationId`, `requestId`.
