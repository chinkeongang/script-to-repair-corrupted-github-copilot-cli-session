import React from "react";
import { Box, Text, useInput } from "ink";
import type { ParsedEvent } from "../parsers/events.js";
import { classifyEvent } from "../utils/event-classify.js";
import { getEventTypeBreakdown } from "../repair/truncate.js";
import { summarizeEvent } from "../parsers/events.js";

interface TruncateConfirmProps {
  events: ParsedEvent[];
  truncateAt: number; // lineNumber of the last event to KEEP
  onConfirm: () => void;
  onCancel: () => void;
}

export function TruncateConfirm({
  events,
  truncateAt,
  onConfirm,
  onCancel,
}: TruncateConfirmProps) {
  useInput((input, key) => {
    if (key.return || input === "y" || input === "Y") {
      onConfirm();
    } else if (key.escape || input === "n" || input === "N") {
      onCancel();
    }
  });

  // Find the index of the truncate point
  const truncateIndex = events.findIndex((e) => e.lineNumber === truncateAt);
  const keepCount = truncateIndex + 1;
  const removeCount = events.length - keepCount;
  const removedEvents = events.slice(keepCount);
  const lastKept = events[truncateIndex];

  // Build breakdown of removed event types
  const breakdown = getEventTypeBreakdown(events, keepCount, events.length);
  const breakdownEntries = [...breakdown.entries()].sort((a, b) => b[1] - a[1]);

  // Check if we're removing a shutdown event
  const removesShutdown = removedEvents.some((e) => e.type === "session.shutdown");
  // Check if we're removing compaction events
  const removesCompaction = removedEvents.some((e) => e.type === "session.compaction_complete");

  return (
    <Box flexDirection="column" paddingLeft={2} paddingRight={2}>
      <Box>
        <Text color="gray">{"┌" + "─".repeat(60) + "┐"}</Text>
      </Box>
      <Box>
        <Text color="gray">{"│ "}</Text>
        <Text color="yellow" bold>{"⚠️  Truncate Session Events"}</Text>
        <Text color="gray">{" ".repeat(60 - 29) + " │"}</Text>
      </Box>
      <Box>
        <Text color="gray">{"│" + " ".repeat(60) + "│"}</Text>
      </Box>

      {/* Keep/remove counts */}
      <Box>
        <Text color="gray">{"│  "}</Text>
        <Text color="green">{"Keep events:    1 – "}{truncateAt}</Text>
        <Text color="gray">{" ".repeat(Math.max(1, 60 - 22 - String(truncateAt).length)) + "│"}</Text>
      </Box>
      <Box>
        <Text color="gray">{"│  "}</Text>
        <Text color="red">{"Remove events:  "}{truncateAt + 1}{" – "}{events[events.length - 1]?.lineNumber ?? "?"}{" ("}{removeCount}{" events)"}</Text>
        <Text color="gray">{" ".repeat(Math.max(1, 4)) + "│"}</Text>
      </Box>

      <Box>
        <Text color="gray">{"│" + " ".repeat(60) + "│"}</Text>
      </Box>

      {/* Breakdown */}
      <Box>
        <Text color="gray">{"│  "}</Text>
        <Text bold>{"Events to remove:"}</Text>
        <Text color="gray">{" ".repeat(60 - 19) + "│"}</Text>
      </Box>
      {breakdownEntries.map(([type, count]) => {
        const info = classifyEvent(type);
        const line = `    ${info.icon} ${count}× ${type}`;
        return (
          <Box key={type}>
            <Text color="gray">{"│"}</Text>
            <Text color={info.color as any}>{line}</Text>
            <Text color="gray">{" ".repeat(Math.max(1, 60 - line.length + 1)) + "│"}</Text>
          </Box>
        );
      })}

      <Box>
        <Text color="gray">{"│" + " ".repeat(60) + "│"}</Text>
      </Box>

      {/* Last kept event */}
      {lastKept && (
        <>
          <Box>
            <Text color="gray">{"│  "}</Text>
            <Text>{"Last kept event:"}</Text>
            <Text color="gray">{" ".repeat(60 - 18) + "│"}</Text>
          </Box>
          <Box>
            <Text color="gray">{"│    "}</Text>
            <Text color="cyan">{lastKept.type}</Text>
            <Text color="gray">{" ["}{lastKept.timestamp.slice(0, 19)}{"]"}</Text>
            <Text color="gray">{" ".repeat(Math.max(1, 4)) + "│"}</Text>
          </Box>
          <Box>
            <Text color="gray">{"│    "}</Text>
            <Text dimColor>{summarizeEvent(lastKept).slice(0, 50)}</Text>
            <Text color="gray">{" ".repeat(Math.max(1, 4)) + "│"}</Text>
          </Box>
        </>
      )}

      <Box>
        <Text color="gray">{"│" + " ".repeat(60) + "│"}</Text>
      </Box>

      {/* Warnings */}
      {removesShutdown && (
        <Box>
          <Text color="gray">{"│  "}</Text>
          <Text color="green">{"✔ Removes shutdown → session will be resumable"}</Text>
          <Text color="gray">{" ".repeat(Math.max(1, 12)) + "│"}</Text>
        </Box>
      )}
      {removesCompaction && (
        <Box>
          <Text color="gray">{"│  "}</Text>
          <Text color="yellow">{"⚠ Removes compaction events — check summary_count"}</Text>
          <Text color="gray">{" ".repeat(Math.max(1, 8)) + "│"}</Text>
        </Box>
      )}

      <Box>
        <Text color="gray">{"│  "}</Text>
        <Text dimColor>{"A backup will be saved as events.jsonl.bak"}</Text>
        <Text color="gray">{" ".repeat(Math.max(1, 15)) + "│"}</Text>
      </Box>

      <Box>
        <Text color="gray">{"│" + " ".repeat(60) + "│"}</Text>
      </Box>
      <Box>
        <Text color="gray">{"│  "}</Text>
        <Text color="green" bold>{"[Enter/Y] Confirm"}</Text>
        <Text>{"    "}</Text>
        <Text color="red">{"[Esc/N] Cancel"}</Text>
        <Text color="gray">{" ".repeat(Math.max(1, 22)) + "│"}</Text>
      </Box>
      <Box>
        <Text color="gray">{"└" + "─".repeat(60) + "┘"}</Text>
      </Box>
    </Box>
  );
}
