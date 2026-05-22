import React from "react";
import { Box, Text } from "ink";

interface HeaderProps {
  title: string;
  subtitle?: string;
  sessionName?: string;
  right?: string;
}

export function Header({ title, subtitle, sessionName, right }: HeaderProps) {
  return (
    <Box flexDirection="column">
      <Box>
        <Text bold color="blue">
          {" "}
          {title}
        </Text>
        {sessionName && (
          <Text color="white">
            {"  │  "}
            {sessionName}
          </Text>
        )}
        {right && (
          <Text color="gray">
            {"  "}
            {right}
          </Text>
        )}
      </Box>
      {subtitle && (
        <Box>
          <Text color="gray" dimColor>
            {" "}
            {subtitle}
          </Text>
        </Box>
      )}
      <Box>
        <Text color="gray" dimColor>
          {"─".repeat(80)}
        </Text>
      </Box>
    </Box>
  );
}
