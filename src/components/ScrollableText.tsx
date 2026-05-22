import React from "react";
import { Box, Text, useInput } from "ink";

interface ScrollableTextProps {
  lines: string[];
  maxHeight: number;
  onClose: () => void;
  title?: string;
}

export function ScrollableText({ lines, maxHeight, onClose, title }: ScrollableTextProps) {
  const [scrollOffset, setScrollOffset] = React.useState(0);
  const viewableLines = Math.max(1, maxHeight - 2);
  const maxScroll = Math.max(0, lines.length - viewableLines);

  useInput((input, key) => {
    if (key.escape || key.leftArrow || input === "q") {
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
      {title && (
        <Box>
          <Text bold color="cyan">
            {" "}
            {title}
          </Text>
          <Text color="gray">
            {"  "}
            (line {scrollOffset + 1}–{Math.min(scrollOffset + viewableLines, lines.length)} of {lines.length})
          </Text>
        </Box>
      )}
      {visible.map((line, i) => (
        <Box key={scrollOffset + i}>
          <Text color="gray" dimColor>
            {String(scrollOffset + i + 1).padStart(5)}{" │ "}
          </Text>
          <Text>{line}</Text>
        </Box>
      ))}
      {lines.length === 0 && (
        <Box paddingLeft={2}>
          <Text color="gray" dimColor>(empty)</Text>
        </Box>
      )}
    </Box>
  );
}
