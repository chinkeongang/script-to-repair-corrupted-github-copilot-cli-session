import React from "react";
import { Box, Text, useInput } from "ink";
import type { ParsedEvent } from "../parsers/events.js";

interface EventDetailProps {
  event: ParsedEvent;
  maxHeight: number;
  onClose: () => void;
}

export function EventDetail({ event, maxHeight, onClose }: EventDetailProps) {
  const jsonStr = JSON.stringify(JSON.parse(event.raw), null, 2);
  const lines = jsonStr.split("\n");
  const [scrollOffset, setScrollOffset] = React.useState(0);
  const viewableLines = Math.max(1, maxHeight - 4);
  const maxScroll = Math.max(0, lines.length - viewableLines);

  useInput((_input, key) => {
    if (key.escape || key.leftArrow) {
      onClose();
      return;
    }
    if (key.upArrow) {
      setScrollOffset((prev) => Math.max(0, prev - 1));
    } else if (key.downArrow) {
      setScrollOffset((prev) => Math.min(maxScroll, prev + 1));
    } else if (key.pageUp) {
      setScrollOffset((prev) => Math.max(0, prev - viewableLines));
    } else if (key.pageDown) {
      setScrollOffset((prev) => Math.min(maxScroll, prev + viewableLines));
    }
  });

  const visible = lines.slice(scrollOffset, scrollOffset + viewableLines);

  return (
    <Box flexDirection="column">
      <Box>
        <Text bold color="cyan">
          {" "}📄 Event #{event.lineNumber}: {event.type}
        </Text>
        <Text color="gray">
          {"  "}({lines.length} lines, line {scrollOffset + 1}–
          {Math.min(scrollOffset + viewableLines, lines.length)})
        </Text>
      </Box>
      <Box>
        <Text color="gray" dimColor>{"─".repeat(80)}</Text>
      </Box>
      {visible.map((line, i) => (
        <Box key={scrollOffset + i}>
          <Text color="gray" dimColor>
            {String(scrollOffset + i + 1).padStart(4)}{" │ "}
          </Text>
          <Text>{line}</Text>
        </Box>
      ))}
      <Box>
        <Text color="gray" dimColor>{"─".repeat(80)}</Text>
      </Box>
      <Box>
        <Text color="gray">{" ↑↓ Scroll  PgUp/PgDn Page  Esc Close"}</Text>
      </Box>
    </Box>
  );
}
