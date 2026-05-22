import React from "react";
import { Box, Text, useInput, useStdout, useApp } from "ink";
import type { WorkspaceInfo } from "../parsers/workspace.js";
import { formatDate, formatSize, truncStr } from "../utils/format.js";

export interface SessionSummary {
  dir: string;
  workspace: WorkspaceInfo;
  eventCount: number;
  eventFileSize: number;
  errorCount: number;
  hasShutdown: boolean;
  checkpointCount: number;
}

interface SessionListProps {
  sessions: SessionSummary[];
  onSelect: (session: SessionSummary) => void;
}

export function SessionList({ sessions, onSelect }: SessionListProps) {
  const { exit } = useApp();
  const { stdout } = useStdout();
  const termHeight = stdout?.rows ?? 24;
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const maxHeight = Math.max(5, termHeight - 14);
  const [scrollOffset, setScrollOffset] = React.useState(0);

  useInput((input, key) => {
    if (input === "q") {
      exit();
      return;
    }
    if (key.upArrow) {
      setSelectedIndex((prev) => {
        const next = Math.max(0, prev - 1);
        if (next < scrollOffset) setScrollOffset(next);
        return next;
      });
    } else if (key.downArrow) {
      setSelectedIndex((prev) => {
        const next = Math.min(sessions.length - 1, prev + 1);
        if (next >= scrollOffset + maxHeight) setScrollOffset(next - maxHeight + 1);
        return next;
      });
    } else if (key.pageUp) {
      setSelectedIndex((prev) => {
        const next = Math.max(0, prev - maxHeight);
        setScrollOffset(Math.max(0, scrollOffset - maxHeight));
        return next;
      });
    } else if (key.pageDown) {
      setSelectedIndex((prev) => {
        const next = Math.min(sessions.length - 1, prev + maxHeight);
        setScrollOffset(Math.min(Math.max(0, sessions.length - maxHeight), scrollOffset + maxHeight));
        return next;
      });
    } else if (key.return) {
      if (sessions[selectedIndex]) {
        onSelect(sessions[selectedIndex]);
      }
    }
  });

  const visible = sessions.slice(scrollOffset, scrollOffset + maxHeight);
  const selected = sessions[selectedIndex];

  return (
    <Box flexDirection="column">
      {visible.length === 0 && (
        <Box paddingLeft={2} paddingTop={1}>
          <Text color="yellow">No sessions found. Check the session directory path.</Text>
        </Box>
      )}
      {visible.map((s, i) => {
        const idx = scrollOffset + i;
        const isSelected = idx === selectedIndex;
        const status = s.errorCount > 0
          ? `⚠️ ${s.errorCount} error${s.errorCount > 1 ? "s" : ""}`
          : s.hasShutdown
            ? "✔ clean"
            : "● active";
        const statusColor = s.errorCount > 0 ? "yellow" : s.hasShutdown ? "green" : "cyan";

        return (
          <Box key={s.workspace.id}>
            <Text color={isSelected ? "blue" : "gray"}>
              {isSelected ? " ▸ " : "   "}
            </Text>
            <Text color={isSelected ? "white" : "gray"}>
              📂{" "}
            </Text>
            <Text bold={isSelected} color={isSelected ? "white" : undefined}>
              {truncStr(s.workspace.name, 35).padEnd(36)}
            </Text>
            <Text color="gray" dimColor>
              {s.workspace.id.slice(0, 8)}{" "}
            </Text>
            <Text color="gray" dimColor>
              {formatDate(s.workspace.updated_at).padEnd(17)}
            </Text>
            <Text color={statusColor}>
              {status}
            </Text>
          </Box>
        );
      })}

      {/* Detail panel for selected session */}
      {selected && (
        <>
          <Box>
            <Text color="gray" dimColor>{"─".repeat(80)}</Text>
          </Box>
          <Box flexDirection="column" paddingLeft={1}>
            <Box>
              <Text color="gray">{" Session: "}</Text>
              <Text bold>{selected.workspace.name}</Text>
            </Box>
            <Box>
              <Text color="gray">{" ID:      "}</Text>
              <Text>{selected.workspace.id}</Text>
            </Box>
            <Box>
              <Text color="gray">{" CWD:     "}</Text>
              <Text>{selected.workspace.cwd}</Text>
            </Box>
            <Box>
              <Text color="gray">{" Events:  "}</Text>
              <Text>{selected.eventCount}</Text>
              <Text color="gray">{"    Errors: "}</Text>
              <Text color={selected.errorCount > 0 ? "red" : "green"}>{selected.errorCount}</Text>
              <Text color="gray">{"    Checkpoints: "}</Text>
              <Text>{selected.checkpointCount}</Text>
              <Text color="gray">{"    Size: "}</Text>
              <Text>{formatSize(selected.eventFileSize)}</Text>
            </Box>
          </Box>
        </>
      )}
    </Box>
  );
}
