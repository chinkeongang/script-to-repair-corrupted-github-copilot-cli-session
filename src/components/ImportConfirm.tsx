import React from "react";
import { Box, Text, useInput } from "ink";
import * as path from "node:path";
import type { ParsedEvent } from "../parsers/events.js";
import type { ExchangeMode } from "../repair/exchange.js";

interface ImportConfirmProps {
  event: ParsedEvent;
  sourceFile: string;
  mode: ExchangeMode;
  newRaw: string;
  error: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ImportConfirm({
  event,
  sourceFile,
  mode,
  newRaw,
  error,
  onConfirm,
  onCancel,
}: ImportConfirmProps) {
  useInput((input, key) => {
    if (key.return || input === "y" || input === "Y") {
      onConfirm();
    } else if (key.escape || input === "n" || input === "N") {
      onCancel();
    }
  });

  const oldLen = event.raw.length;
  const newLen = newRaw.length;
  const delta = newLen - oldLen;
  const modeLabel =
    mode === "text" ? "message text -> data.content" : "full event JSON (whole line)";

  return (
    <Box flexDirection="column" paddingLeft={2} paddingRight={2}>
      <Box>
        <Text color="yellow" bold>{"  Import / Replace Event"}</Text>
      </Box>
      <Box>
        <Text color="gray" dimColor>{"-".repeat(72)}</Text>
      </Box>

      <Box>
        <Text color="gray">{"  Replacing event "}</Text>
        <Text bold>{"#"}{event.lineNumber}</Text>
        <Text color="gray">{":  "}</Text>
        <Text color="cyan" bold>{event.type}</Text>
      </Box>
      <Box>
        <Text color="gray">{"  Source file:    "}</Text>
        <Text>{path.basename(sourceFile)}</Text>
        <Text color="gray" dimColor>{"   (in Downloads)"}</Text>
      </Box>
      <Box>
        <Text color="gray">{"  Replace mode:   "}</Text>
        <Text>{modeLabel}</Text>
      </Box>
      <Box>
        <Text color="gray">{"  Line size:      "}</Text>
        <Text>{oldLen}{" -> "}{newLen}{" chars  ("}</Text>
        <Text color={delta === 0 ? "gray" : delta > 0 ? "green" : "red"}>
          {delta >= 0 ? "+" : ""}{delta}
        </Text>
        <Text>{")"}</Text>
      </Box>

      <Box marginTop={1}>
        <Text dimColor>{"  A backup of events.jsonl is saved before writing."}</Text>
      </Box>

      {error && (
        <Box marginTop={1}>
          <Text color="red">{"  Failed: "}{error}</Text>
        </Box>
      )}

      <Box marginTop={1}>
        <Text color="green" bold>{"  [Enter/Y] Replace"}</Text>
        <Text>{"     "}</Text>
        <Text color="red">{"[Esc/N] Cancel"}</Text>
      </Box>
    </Box>
  );
}
