import React from "react";
import { Box, Text, useInput } from "ink";
import type { ParsedEvent } from "../parsers/events.js";
import { classifyEvent, type EventCategory, ALL_CATEGORIES, CATEGORY_LABELS } from "../utils/event-classify.js";
import { summarizeEvent } from "../parsers/events.js";
import { truncStr } from "../utils/format.js";

interface EventListProps {
  events: ParsedEvent[];
  maxHeight: number;
  truncateMarker: number | null;
  onViewEvent: (event: ParsedEvent) => void;
  onSetTruncate: (lineNumber: number) => void;
  disabled?: boolean;
  categoryFilter: Set<EventCategory>;
  onToggleCategory: (cat: EventCategory) => void;
  filterMode: boolean;
  onToggleFilterMode: () => void;
}

export function EventList({
  events,
  maxHeight,
  truncateMarker,
  onViewEvent,
  onSetTruncate,
  disabled,
  categoryFilter,
  onToggleCategory,
  filterMode,
  onToggleFilterMode,
}: EventListProps) {
  // Filter events by category
  const filteredEvents = React.useMemo(() => {
    if (categoryFilter.size === ALL_CATEGORIES.length) return events;
    return events.filter((e) => categoryFilter.has(classifyEvent(e.type).category));
  }, [events, categoryFilter]);

  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const [scrollOffset, setScrollOffset] = React.useState(0);
  const [filterCursor, setFilterCursor] = React.useState(0);

  // Filter bar height
  const filterBarHeight = 3;
  const listHeight = Math.max(3, maxHeight - filterBarHeight - 4);

  // Clamp selected index when filters change
  React.useEffect(() => {
    if (selectedIndex >= filteredEvents.length) {
      setSelectedIndex(Math.max(0, filteredEvents.length - 1));
    }
  }, [filteredEvents.length, selectedIndex]);

  useInput(
    (input, key) => {
      if (disabled) return;

      // Filter mode keys
      if (filterMode) {
        if (key.escape || input === "f" || input === "F") {
          onToggleFilterMode();
          return;
        }
        if (key.leftArrow) {
          setFilterCursor((p) => (p - 1 + ALL_CATEGORIES.length) % ALL_CATEGORIES.length);
          return;
        }
        if (key.rightArrow) {
          setFilterCursor((p) => (p + 1) % ALL_CATEGORIES.length);
          return;
        }
        if (key.return || input === " ") {
          onToggleCategory(ALL_CATEGORIES[filterCursor]);
          return;
        }
        if (input === "r" || input === "R") {
          // Reset: enable all
          for (const cat of ALL_CATEGORIES) {
            if (!categoryFilter.has(cat)) onToggleCategory(cat);
          }
          return;
        }
        return;
      }

      // Normal list navigation
      if (key.upArrow) {
        setSelectedIndex((prev) => {
          const next = Math.max(0, prev - 1);
          if (next < scrollOffset) setScrollOffset(next);
          return next;
        });
      } else if (key.downArrow) {
        setSelectedIndex((prev) => {
          const next = Math.min(filteredEvents.length - 1, prev + 1);
          if (next >= scrollOffset + listHeight) setScrollOffset(next - listHeight + 1);
          return next;
        });
      } else if (key.pageUp) {
        setSelectedIndex((prev) => {
          const next = Math.max(0, prev - listHeight);
          setScrollOffset(Math.max(0, scrollOffset - listHeight));
          return next;
        });
      } else if (key.pageDown) {
        setSelectedIndex((prev) => {
          const next = Math.min(filteredEvents.length - 1, prev + listHeight);
          setScrollOffset(Math.min(
            Math.max(0, filteredEvents.length - listHeight),
            scrollOffset + listHeight
          ));
          return next;
        });
      } else if (key.return) {
        if (filteredEvents[selectedIndex]) {
          onViewEvent(filteredEvents[selectedIndex]);
        }
      } else if (input === "t" || input === "T") {
        if (filteredEvents[selectedIndex]) {
          onSetTruncate(filteredEvents[selectedIndex].lineNumber);
        }
      } else if (input === "f" || input === "F") {
        onToggleFilterMode();
      }
    }
  );

  const visible = filteredEvents.slice(scrollOffset, scrollOffset + listHeight);
  const selected = filteredEvents[selectedIndex];

  return (
    <Box flexDirection="column">
      {/* Filter bar */}
      <Box paddingLeft={1}>
        <Text color="gray">{" 🔍 Filters "}</Text>
        <Text color="gray" dimColor>{"[f: edit filters]"}</Text>
      </Box>
      <Box paddingLeft={3}>
        {ALL_CATEGORIES.map((cat, i) => {
          const isActive = categoryFilter.has(cat);
          const isCursorHere = filterMode && filterCursor === i;
          return (
            <React.Fragment key={cat}>
              <Text
                color={isCursorHere ? "blue" : isActive ? "green" : "red"}
                bold={isCursorHere}
                inverse={isCursorHere}
              >
                {isActive ? " ✔ " : " ✗ "}
                {CATEGORY_LABELS[cat]}{" "}
              </Text>
            </React.Fragment>
          );
        })}
      </Box>
      <Box paddingLeft={3}>
        <Text color="gray" dimColor>
          Showing {filteredEvents.length}/{events.length} events
        </Text>
      </Box>

      {/* Divider */}
      <Box>
        <Text color="gray" dimColor>{"─".repeat(80)}</Text>
      </Box>

      {/* Event list */}
      {visible.map((evt, i) => {
        const idx = scrollOffset + i;
        const isSelected = idx === selectedIndex;
        const info = classifyEvent(evt.type);
        const isTruncatePoint = truncateMarker === evt.lineNumber;
        const isAfterTruncate = truncateMarker !== null && evt.lineNumber > truncateMarker;
        const time = evt.timestamp.slice(11, 19);
        const summary = truncStr(summarizeEvent(evt), 40);

        return (
          <Box key={evt.lineNumber}>
            <Text color={isSelected ? "blue" : "gray"}>
              {isSelected ? "▸" : " "}
            </Text>
            {isTruncatePoint && <Text color="red" bold>{"✂ "}</Text>}
            {!isTruncatePoint && <Text>{"  "}</Text>}
            <Text color="gray" dimColor>
              {String(evt.lineNumber).padStart(5)}{" "}
            </Text>
            <Text color={info.color as any}>
              {info.icon}{" "}
            </Text>
            <Text
              color={isAfterTruncate ? "red" : isSelected ? "white" : undefined}
              dimColor={isAfterTruncate}
              strikethrough={isAfterTruncate}
            >
              {evt.type.padEnd(28)}{" "}
            </Text>
            <Text color="gray" dimColor>
              {time}{" "}
            </Text>
            <Text color={isAfterTruncate ? "red" : "gray"} dimColor={isAfterTruncate}>
              {summary}
            </Text>
          </Box>
        );
      })}

      {filteredEvents.length === 0 && (
        <Box paddingLeft={2}>
          <Text color="yellow">No events match the current filter.</Text>
        </Box>
      )}

      {/* Detail panel for selected event */}
      {selected && (
        <>
          <Box>
            <Text color="gray" dimColor>{"─".repeat(80)}</Text>
          </Box>
          <Box paddingLeft={1} flexDirection="column">
            <Box>
              <Text color="gray">{" Event #"}</Text>
              <Text bold>{selected.lineNumber}</Text>
              <Text color="gray">{": "}</Text>
              <Text color={classifyEvent(selected.type).color as any} bold>
                {selected.type}
              </Text>
            </Box>
            <Box>
              <Text color="gray">{" Timestamp: "}</Text>
              <Text>{selected.timestamp}</Text>
              <Text color="gray">{"   ID: "}</Text>
              <Text dimColor>{selected.id.slice(0, 12)}…</Text>
            </Box>
            <Box>
              <Text color="gray">{" Summary: "}</Text>
              <Text>{summarizeEvent(selected)}</Text>
            </Box>
          </Box>
        </>
      )}
    </Box>
  );
}
