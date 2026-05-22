import React from "react";
import { Box, Text, useInput } from "ink";
import type { CheckpointInfo } from "../parsers/checkpoints.js";
import { truncStr } from "../utils/format.js";
import { ScrollableText } from "./ScrollableText.js";

interface CheckpointListProps {
  checkpoints: CheckpointInfo[];
  maxHeight: number;
  disabled?: boolean;
}

export function CheckpointList({ checkpoints, maxHeight, disabled }: CheckpointListProps) {
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const [viewing, setViewing] = React.useState<CheckpointInfo | null>(null);
  const [viewSection, setViewSection] = React.useState<string | null>(null);

  const listHeight = Math.max(3, maxHeight - 6);

  useInput(
    (input, key) => {
      if (disabled) return;

      if (viewing) {
        // ScrollableText handles its own input
        return;
      }

      if (key.upArrow) {
        setSelectedIndex((p) => Math.max(0, p - 1));
      } else if (key.downArrow) {
        setSelectedIndex((p) => Math.min(checkpoints.length - 1, p + 1));
      } else if (key.return) {
        const cp = checkpoints[selectedIndex];
        if (cp) {
          // Show overview section by default
          const sectionKeys = Object.keys(cp.sections);
          if (sectionKeys.length > 0) {
            setViewing(cp);
            setViewSection(sectionKeys[0]);
          }
        }
      }
    }
  );

  if (viewing && viewSection) {
    const content = viewing.sections[viewSection] ?? "";
    const sectionKeys = Object.keys(viewing.sections);
    const sectionIndex = sectionKeys.indexOf(viewSection);

    return (
      <Box flexDirection="column">
        <Box>
          <Text color="gray">{" Checkpoint #"}</Text>
          <Text bold>{viewing.number}</Text>
          <Text color="gray">{" │ Section: "}</Text>
          {sectionKeys.map((sk, i) => (
            <React.Fragment key={sk}>
              {i > 0 && <Text color="gray">{" "}</Text>}
              <Text
                color={sk === viewSection ? "cyan" : "gray"}
                bold={sk === viewSection}
                underline={sk === viewSection}
              >
                {sk}
              </Text>
            </React.Fragment>
          ))}
        </Box>
        <Box>
          <Text color="gray" dimColor>{"─".repeat(80)}</Text>
        </Box>
        <ScrollableText
          lines={content.split("\n")}
          maxHeight={maxHeight - 4}
          title={`<${viewSection}>`}
          onClose={() => {
            // Try next section, or close
            if (sectionIndex < sectionKeys.length - 1) {
              setViewSection(sectionKeys[sectionIndex + 1]);
            } else {
              setViewing(null);
              setViewSection(null);
            }
          }}
        />
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      {checkpoints.length === 0 && (
        <Box paddingLeft={2}>
          <Text color="yellow">No checkpoints found.</Text>
        </Box>
      )}
      {checkpoints.map((cp, i) => {
        const isSelected = i === selectedIndex;
        return (
          <Box key={cp.filename}>
            <Text color={isSelected ? "blue" : "gray"}>
              {isSelected ? " ▸ " : "   "}
            </Text>
            <Text color={isSelected ? "white" : undefined} bold={isSelected}>
              #{String(cp.number).padStart(2)}{" "}
            </Text>
            <Text color={isSelected ? "white" : undefined}>
              {truncStr(cp.title, 45).padEnd(46)}
            </Text>
            <Text color="gray" dimColor>
              {cp.size} bytes
            </Text>
          </Box>
        );
      })}

      {/* Overview of selected checkpoint */}
      {checkpoints[selectedIndex] && (
        <>
          <Box>
            <Text color="gray" dimColor>{"─".repeat(80)}</Text>
          </Box>
          <Box paddingLeft={1} flexDirection="column">
            <Box>
              <Text color="gray">{" Overview: "}</Text>
              <Text>{truncStr(checkpoints[selectedIndex].overview, 120)}</Text>
            </Box>
            <Box>
              <Text color="gray">{" Sections: "}</Text>
              <Text>{Object.keys(checkpoints[selectedIndex].sections).join(", ")}</Text>
            </Box>
          </Box>
        </>
      )}
    </Box>
  );
}
