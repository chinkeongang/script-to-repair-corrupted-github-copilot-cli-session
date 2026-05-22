import React from "react";
import { Box, Text } from "ink";

interface StatusBarProps {
  message?: string;
  isLoading?: boolean;
}

export function StatusBar({ message, isLoading }: StatusBarProps) {
  return (
    <Box flexDirection="column">
      <Box>
        <Text color="gray" dimColor>
          {"─".repeat(80)}
        </Text>
      </Box>
      <Box>
        <Text color="gray">
          {" "}
          {isLoading ? "⏳ Loading..." : message ?? ""}
        </Text>
      </Box>
    </Box>
  );
}
