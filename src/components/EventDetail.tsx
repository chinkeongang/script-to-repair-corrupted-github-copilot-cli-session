import React from "react";
import { Box, Text, useInput, useStdout, useStdin } from "ink";
import * as path from "node:path";
import type { ParsedEvent } from "../parsers/events.js";
import { exportEvent, prepareImport, type PreparedImport } from "../repair/exchange.js";

interface EventDetailProps {
  event: ParsedEvent;
  maxHeight: number;
  onClose: () => void;
  onImport: (prepared: PreparedImport) => void;
}

const GUTTER = 7; // "NNNN | "

// Home/End are not surfaced by Ink's useInput, so match their raw sequences.
const HOME_SEQS = new Set(["\x1b[H", "\x1bOH", "\x1b[1~", "\x1b[7~"]);
const END_SEQS = new Set(["\x1b[F", "\x1bOF", "\x1b[4~", "\x1b[8~"]);

export function EventDetail({ event, maxHeight, onClose, onImport }: EventDetailProps) {
  const { stdout } = useStdout();
  const { internal_eventEmitter } = useStdin();
  const termWidth = stdout?.columns ?? 80;
  // Wrap within the app's 80-col frame, but shrink on narrower terminals.
  const contentWidth = Math.max(20, Math.min(termWidth - GUTTER - 1, 80 - GUTTER));

  // Pretty-print, then pre-wrap each logical line to the viewport width. A
  // system.message/user.message keeps its whole content on one JSON line, so
  // without wrapping there is nothing to scroll even though it overflows the
  // screen. Paginating over the wrapped rows is what makes the page keys move.
  const rows = React.useMemo(() => {
    let pretty: string;
    try {
      pretty = JSON.stringify(JSON.parse(event.raw), null, 2);
    } catch {
      pretty = event.raw;
    }
    const out: Array<{ lineNo: number | null; text: string }> = [];
    const logical = pretty.split("\n");
    for (let i = 0; i < logical.length; i++) {
      const chars = Array.from(logical[i]);
      if (chars.length === 0) {
        out.push({ lineNo: i + 1, text: "" });
        continue;
      }
      for (let start = 0; start < chars.length; start += contentWidth) {
        out.push({
          lineNo: start === 0 ? i + 1 : null,
          text: chars.slice(start, start + contentWidth).join(""),
        });
      }
    }
    return out;
  }, [event.raw, contentWidth]);

  const [scrollOffset, setScrollOffset] = React.useState(0);
  const [status, setStatus] = React.useState<string | null>(null);
  const viewableLines = Math.max(1, maxHeight - 5); // reserve a line for status
  const maxScroll = Math.max(0, rows.length - viewableLines);

  // Keep the offset in range when width/content changes.
  React.useEffect(() => {
    setScrollOffset((prev) => Math.min(prev, maxScroll));
  }, [maxScroll]);

  const doExport = React.useCallback(() => {
    const r = exportEvent(event);
    setStatus(
      r.success
        ? `✔ Saved ${path.basename(r.file)} to Downloads -- edit it, then press i to import`
        : `✘ Export failed: ${r.error}`
    );
  }, [event]);

  const doImport = React.useCallback(() => {
    const prep = prepareImport(event);
    if ("error" in prep) {
      setStatus(`✘ ${prep.error}`);
    } else {
      onImport(prep);
    }
  }, [event, onImport]);

  useInput((input, key) => {
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
    } else if (input === "e" || input === "E") {
      doExport();
    } else if (input === "i" || input === "I") {
      doImport();
    }
  });

  // Home/End come straight off the raw input stream (Ink strips them).
  React.useEffect(() => {
    const onData = (data: unknown) => {
      const s = String(data);
      if (HOME_SEQS.has(s)) setScrollOffset(0);
      else if (END_SEQS.has(s)) setScrollOffset(maxScroll);
    };
    internal_eventEmitter?.on("input", onData);
    return () => {
      internal_eventEmitter?.removeListener("input", onData);
    };
  }, [internal_eventEmitter, maxScroll]);

  const visible = rows.slice(scrollOffset, scrollOffset + viewableLines);

  return (
    <Box flexDirection="column">
      <Box>
        <Text bold color="cyan">
          {" "}📄 Event #{event.lineNumber}: {event.type}
        </Text>
        <Text color="gray">
          {"  "}({rows.length} lines, line {scrollOffset + 1}–
          {Math.min(scrollOffset + viewableLines, rows.length)})
        </Text>
      </Box>
      <Box>
        <Text color="gray" dimColor>{"─".repeat(80)}</Text>
      </Box>
      {visible.map((row, i) => (
        <Box key={scrollOffset + i}>
          <Text color="gray" dimColor>
            {(row.lineNo === null ? "" : String(row.lineNo)).padStart(4)}{" │ "}
          </Text>
          <Text wrap="truncate-end">{row.text}</Text>
        </Box>
      ))}
      <Box>
        <Text color="gray" dimColor>{"─".repeat(80)}</Text>
      </Box>
      <Box>
        <Text color="gray">{" ↑↓ Line  PgUp/PgDn Page  Home/End  e Export  i Import  Esc Close"}</Text>
      </Box>
      <Box>
        <Text wrap="truncate-end" color={status?.startsWith("✘") ? "red" : "green"}>
          {status ? " " + status : " "}
        </Text>
      </Box>
    </Box>
  );
}
