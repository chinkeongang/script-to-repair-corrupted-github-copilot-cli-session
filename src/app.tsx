import React, { useState, useCallback, useEffect, useMemo } from "react";
import { Box, Text, useApp, useInput, useStdout } from "ink";
import * as fs from "node:fs";
import * as path from "node:path";

import { parseWorkspace, type WorkspaceInfo } from "./parsers/workspace.js";
import { parseEventsSync, getEventsStats, countErrors, hasShutdown, type ParsedEvent } from "./parsers/events.js";
import { parseCheckpoints, type CheckpointInfo } from "./parsers/checkpoints.js";
import { parseDatabaseSync, type TableInfo } from "./parsers/database.js";
import { truncateEvents } from "./repair/truncate.js";
import { type EventCategory, ALL_CATEGORIES } from "./utils/event-classify.js";

import { Header } from "./components/Header.js";
import { StatusBar } from "./components/StatusBar.js";
import { SessionList, type SessionSummary } from "./components/SessionList.js";
import { TabBar, type TabId } from "./components/TabBar.js";
import { EventList } from "./components/EventList.js";
import { EventDetail } from "./components/EventDetail.js";
import { TruncateConfirm } from "./components/TruncateConfirm.js";
import { CheckpointList } from "./components/CheckpointList.js";
import { DatabaseBrowser } from "./components/DatabaseBrowser.js";
import { MetadataEditor } from "./components/MetadataEditor.js";
import { RepairPanel } from "./components/RepairPanel.js";

interface AppProps {
  sessionDir: string;
  initialSessionId?: string;
}

export function App({ sessionDir, initialSessionId }: AppProps) {
  const { exit } = useApp();
  const { stdout } = useStdout();
  const termHeight = stdout?.rows ?? 24;

  // App-level state
  const [screen, setScreen] = useState<"session-list" | "session-detail">(
    initialSessionId ? "session-detail" : "session-list"
  );
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Session detail state
  const [selectedSession, setSelectedSession] = useState<SessionSummary | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("events");

  // Events state
  const [events, setEvents] = useState<ParsedEvent[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<Set<EventCategory>>(new Set(ALL_CATEGORIES));
  const [filterMode, setFilterMode] = useState(false);
  const [truncateMarker, setTruncateMarker] = useState<number | null>(null);

  // Modal state
  const [modal, setModal] = useState<
    | null
    | { type: "event-detail"; event: ParsedEvent }
    | { type: "truncate-confirm" }
  >(null);

  // Checkpoint / DB state
  const [checkpoints, setCheckpoints] = useState<CheckpointInfo[]>([]);
  const [dbTables, setDbTables] = useState<TableInfo[]>([]);
  const [workspace, setWorkspace] = useState<WorkspaceInfo | null>(null);

  // Scan sessions directory
  const scanSessions = useCallback(() => {
    setIsLoading(true);
    try {
      if (!fs.existsSync(sessionDir)) {
        setSessions([]);
        setIsLoading(false);
        return;
      }

      const entries = fs.readdirSync(sessionDir);
      const results: SessionSummary[] = [];

      for (const entry of entries) {
        const fullPath = path.join(sessionDir, entry);
        const stat = fs.statSync(fullPath);
        if (!stat.isDirectory()) continue;

        const ws = parseWorkspace(fullPath);
        if (!ws) continue;

        const stats = getEventsStats(fullPath);
        // Quick error/shutdown check: parse events for this
        const evts = parseEventsSync(fullPath);
        const cpDir = path.join(fullPath, "checkpoints");
        const cpCount = fs.existsSync(cpDir)
          ? fs.readdirSync(cpDir).filter((f) => f.endsWith(".md") && f !== "index.md").length
          : 0;

        results.push({
          dir: fullPath,
          workspace: ws,
          eventCount: stats.count,
          eventFileSize: stats.size,
          errorCount: countErrors(evts),
          hasShutdown: hasShutdown(evts),
          checkpointCount: cpCount,
        });
      }

      // Sort by updated_at descending
      results.sort((a, b) => b.workspace.updated_at.localeCompare(a.workspace.updated_at));
      setSessions(results);
    } catch {
      setSessions([]);
    }
    setIsLoading(false);
  }, [sessionDir]);

  // Load a specific session's detail data
  const loadSessionDetail = useCallback((session: SessionSummary) => {
    setSelectedSession(session);
    setScreen("session-detail");
    setActiveTab("events");
    setTruncateMarker(null);
    setModal(null);
    setFilterMode(false);
    setCategoryFilter(new Set(ALL_CATEGORIES));

    // Load events
    const evts = parseEventsSync(session.dir);
    setEvents(evts);

    // Load checkpoints
    const cps = parseCheckpoints(session.dir);
    setCheckpoints(cps);

    // Load database
    const tables = parseDatabaseSync(session.dir);
    setDbTables(tables);

    // Load workspace
    const ws = parseWorkspace(session.dir);
    setWorkspace(ws);
  }, []);

  // Initial load
  useEffect(() => {
    if (initialSessionId) {
      // Open specific session directly
      const dir = path.join(sessionDir, initialSessionId);
      const ws = parseWorkspace(dir);
      if (ws) {
        const stats = getEventsStats(dir);
        const evts = parseEventsSync(dir);
        const cpDir = path.join(dir, "checkpoints");
        const cpCount = fs.existsSync(cpDir)
          ? fs.readdirSync(cpDir).filter((f) => f.endsWith(".md") && f !== "index.md").length
          : 0;
        const session: SessionSummary = {
          dir,
          workspace: ws,
          eventCount: stats.count,
          eventFileSize: stats.size,
          errorCount: countErrors(evts),
          hasShutdown: hasShutdown(evts),
          checkpointCount: cpCount,
        };
        loadSessionDetail(session);
      } else {
        scanSessions();
      }
    } else {
      scanSessions();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Reload after truncation
  const handleTruncateComplete = useCallback(() => {
    if (selectedSession) {
      // Re-read events
      const evts = parseEventsSync(selectedSession.dir);
      setEvents(evts);
      setTruncateMarker(null);
      setModal(null);
    }
  }, [selectedSession]);

  // Tab counts
  const tabCounts = useMemo(() => ({
    events: events.length,
    checkpoints: checkpoints.length,
    database: dbTables.reduce((sum, t) => sum + t.rowCount, 0),
  }), [events, checkpoints, dbTables]);

  // Global input handler (tabs + back + quit)
  useInput((input, key) => {
    // Modals handle their own input
    if (modal) return;
    if (filterMode) return;

    if (input === "q") {
      if (screen === "session-detail") {
        // Clear screen artifacts
        process.stdout.write("\x1b[2J\x1b[H");
        setScreen("session-list");
        scanSessions();
      } else {
        exit();
      }
      return;
    }

    if (key.escape || key.leftArrow || key.backspace) {
      if (screen === "session-detail") {
        process.stdout.write("\x1b[2J\x1b[H");
        setScreen("session-list");
        scanSessions();
        return;
      }
    }

    // Tab switching in session detail view
    if (screen === "session-detail") {
      const tabKeys: Record<string, TabId> = {
        "1": "events",
        "2": "checkpoints",
        "3": "database",
        "4": "metadata",
        "5": "repair",
      };
      if (tabKeys[input]) {
        process.stdout.write("\x1b[2J\x1b[H");
        setActiveTab(tabKeys[input]);
      }
    }

    if (input === "r" || input === "R") {
      if (screen === "session-list") {
        scanSessions();
      }
    }
  });

  // Handle event view/truncate from EventList
  const handleViewEvent = useCallback((event: ParsedEvent) => {
    setModal({ type: "event-detail", event });
  }, []);

  const handleSetTruncate = useCallback((lineNumber: number) => {
    setTruncateMarker(lineNumber);
    setModal({ type: "truncate-confirm" });
  }, []);

  const handleToggleCategory = useCallback((cat: EventCategory) => {
    setCategoryFilter((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) {
        if (next.size > 1) next.delete(cat);
      } else {
        next.add(cat);
      }
      return next;
    });
  }, []);

  const contentHeight = termHeight - 6;

  // ========== RENDER ==========

  // Modal overlay: Event Detail
  if (modal?.type === "event-detail") {
    return (
      <Box flexDirection="column" height={termHeight}>
        <Header title="Session Repair" sessionName={selectedSession?.workspace.name} />
        <EventDetail
          event={modal.event}
          maxHeight={contentHeight}
          onClose={() => setModal(null)}
        />
      </Box>
    );
  }

  // Modal overlay: Truncate Confirm
  if (modal?.type === "truncate-confirm" && truncateMarker !== null) {
    return (
      <Box flexDirection="column" height={termHeight}>
        <Header title="Session Repair" sessionName={selectedSession?.workspace.name} />
        <TruncateConfirm
          events={events}
          truncateAt={truncateMarker}
          onConfirm={() => {
            const result = truncateEvents(selectedSession!.dir, truncateMarker);
            if (result.success) {
              handleTruncateComplete();
            }
          }}
          onCancel={() => setModal(null)}
        />
      </Box>
    );
  }

  // Session List screen
  if (screen === "session-list") {
    return (
      <Box flexDirection="column" height={termHeight}>
        <Header
          title="Session Repair Tool"
          subtitle={`Scanning: ${sessionDir}  │  Found ${sessions.length} session${sessions.length !== 1 ? "s" : ""}`}
        />
        {isLoading ? (
          <Box paddingLeft={2}>
            <Text color="yellow">⏳ Scanning sessions...</Text>
          </Box>
        ) : (
          <SessionList sessions={sessions} onSelect={loadSessionDetail} />
        )}
        <Box flexGrow={1} />
        <StatusBar message=" ↑↓ Navigate  Enter Open  r Refresh  q Quit" />
      </Box>
    );
  }

  // Session Detail screen
  return (
    <Box flexDirection="column" height={termHeight}>
      <Header
        title="Session Repair"
        sessionName={selectedSession?.workspace.name}
        right={`${events.length} events`}
      />
      <TabBar activeTab={activeTab} counts={tabCounts} />
      <Box>
        <Text color="gray" dimColor>{"─".repeat(80)}</Text>
      </Box>

      {/* Tab content */}
      {activeTab === "events" && (
        <EventList
          events={events}
          maxHeight={contentHeight - 3}
          truncateMarker={truncateMarker}
          onViewEvent={handleViewEvent}
          onSetTruncate={handleSetTruncate}
          categoryFilter={categoryFilter}
          onToggleCategory={handleToggleCategory}
          filterMode={filterMode}
          onToggleFilterMode={() => setFilterMode((p) => !p)}
        />
      )}

      {activeTab === "checkpoints" && (
        <CheckpointList
          checkpoints={checkpoints}
          maxHeight={contentHeight - 3}
          disabled={modal !== null}
        />
      )}

      {activeTab === "database" && (
        <DatabaseBrowser
          tables={dbTables}
          disabled={modal !== null}
        />
      )}

      {activeTab === "metadata" && workspace && (
        <MetadataEditor
          workspace={workspace}
          disabled={modal !== null}
        />
      )}

      {activeTab === "repair" && selectedSession && (
        <RepairPanel
          sessionDir={selectedSession.dir}
          events={events}
          truncateMarker={truncateMarker}
          onTruncateComplete={handleTruncateComplete}
          disabled={modal !== null}
        />
      )}

      <Box flexGrow={1} />
      <StatusBar
        message={
          activeTab === "events"
            ? " ↑↓ Navigate  Enter View  t Truncate  f Filter  1-5 Tabs  ← Back  q Quit"
            : activeTab === "repair"
              ? " ↑↓ Navigate  Enter Execute  1-5 Tabs  ← Back  q Quit"
              : " ↑↓ Navigate  Enter View  1-5 Tabs  ← Back  q Quit"
        }
      />
    </Box>
  );
}
