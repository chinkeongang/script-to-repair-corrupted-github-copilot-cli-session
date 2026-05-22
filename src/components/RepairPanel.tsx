import React from "react";
import { Box, Text, useInput } from "ink";
import type { ParsedEvent } from "../parsers/events.js";
import { truncateEvents } from "../repair/truncate.js";

interface RepairPanelProps {
  sessionDir: string;
  events: ParsedEvent[];
  truncateMarker: number | null;
  onTruncateComplete: () => void;
  disabled?: boolean;
}

export function RepairPanel({
  sessionDir,
  events,
  truncateMarker,
  onTruncateComplete,
  disabled,
}: RepairPanelProps) {
  const [message, setMessage] = React.useState<string | null>(null);
  const [messageColor, setMessageColor] = React.useState<string>("green");
  const [selectedIndex, setSelectedIndex] = React.useState(0);

  const actions = [
    {
      label: "Truncate events at marker",
      enabled: truncateMarker !== null,
      description: truncateMarker
        ? `Truncate at line ${truncateMarker} (remove ${events.length - events.findIndex((e) => e.lineNumber === truncateMarker) - 1} events)`
        : "Set a truncation marker in the Events tab first (press 't' on an event)",
    },
    {
      label: "Remove shutdown event",
      enabled: events.some((e) => e.type === "session.shutdown"),
      description: "Remove the session.shutdown event to make the session resumable",
    },
    {
      label: "Quick fix: revert last N user messages",
      enabled: events.some((e) => e.type === "user.message"),
      description: "Find the Nth-to-last user.message and truncate everything after the event before it",
    },
  ];

  useInput(
    (input, key) => {
      if (disabled) return;

      if (key.upArrow) {
        setSelectedIndex((p) => Math.max(0, p - 1));
      } else if (key.downArrow) {
        setSelectedIndex((p) => Math.min(actions.length - 1, p + 1));
      } else if (key.return) {
        const action = actions[selectedIndex];
        if (!action?.enabled) {
          setMessage("Action not available");
          setMessageColor("yellow");
          return;
        }

        if (selectedIndex === 0 && truncateMarker !== null) {
          // Truncate at marker
          const result = truncateEvents(sessionDir, truncateMarker);
          if (result.success) {
            setMessage(`✔ Truncated! Kept ${result.keptLines} lines, removed ${result.removedLines}. Backup: ${result.backupPath}`);
            setMessageColor("green");
            onTruncateComplete();
          } else {
            setMessage(`✘ Failed: ${result.error}`);
            setMessageColor("red");
          }
        } else if (selectedIndex === 1) {
          // Remove shutdown: truncate at the line before shutdown
          const shutdownIdx = events.findIndex((e) => e.type === "session.shutdown");
          if (shutdownIdx > 0) {
            const keepAt = events[shutdownIdx - 1].lineNumber;
            const result = truncateEvents(sessionDir, keepAt);
            if (result.success) {
              setMessage(`✔ Shutdown removed! Backup: ${result.backupPath}`);
              setMessageColor("green");
              onTruncateComplete();
            } else {
              setMessage(`✘ Failed: ${result.error}`);
              setMessageColor("red");
            }
          }
        } else if (selectedIndex === 2) {
          // Quick fix: find the last user.message and truncate before it
          const userMsgs = events.filter((e) => e.type === "user.message");
          if (userMsgs.length > 0) {
            const lastUserMsg = userMsgs[userMsgs.length - 1];
            // Find the event just before this user.message (usually a system.message)
            const lastUserIdx = events.findIndex((e) => e.lineNumber === lastUserMsg.lineNumber);
            // Go back to find the preceding non-system.message event
            let keepIdx = lastUserIdx - 1;
            while (keepIdx > 0 && events[keepIdx].type === "system.message") {
              keepIdx--;
            }
            if (keepIdx >= 0) {
              const keepAt = events[keepIdx].lineNumber;
              const result = truncateEvents(sessionDir, keepAt);
              if (result.success) {
                setMessage(`✔ Reverted last user message! Kept ${result.keptLines} lines. Backup: ${result.backupPath}`);
                setMessageColor("green");
                onTruncateComplete();
              } else {
                setMessage(`✘ Failed: ${result.error}`);
                setMessageColor("red");
              }
            }
          }
        }
      }
    }
  );

  return (
    <Box flexDirection="column">
      <Box paddingLeft={1}>
        <Text bold color="cyan">{" 🔧 Repair Actions"}</Text>
      </Box>
      <Box>
        <Text color="gray" dimColor>{"─".repeat(80)}</Text>
      </Box>

      {actions.map((action, i) => {
        const isSelected = i === selectedIndex;
        return (
          <Box key={i} flexDirection="column">
            <Box>
              <Text color={isSelected ? "blue" : "gray"}>
                {isSelected ? " ▸ " : "   "}
              </Text>
              <Text
                bold={isSelected}
                color={action.enabled ? (isSelected ? "white" : undefined) : "gray"}
                dimColor={!action.enabled}
              >
                {action.label}
              </Text>
              {!action.enabled && (
                <Text color="gray" dimColor>{" (unavailable)"}</Text>
              )}
            </Box>
          </Box>
        );
      })}

      {/* Description */}
      <Box>
        <Text color="gray" dimColor>{"─".repeat(80)}</Text>
      </Box>
      <Box paddingLeft={1}>
        <Text color="gray">{" "}{actions[selectedIndex]?.description ?? ""}</Text>
      </Box>

      {/* Result message */}
      {message && (
        <Box paddingLeft={1} paddingTop={1}>
          <Text color={messageColor as any}>{" "}{message}</Text>
        </Box>
      )}
    </Box>
  );
}
