import React from "react";
import { Box, Text, useInput } from "ink";
import type { WorkspaceInfo } from "../parsers/workspace.js";

interface MetadataEditorProps {
  workspace: WorkspaceInfo;
  disabled?: boolean;
}

interface FieldDef {
  key: string;
  label: string;
  safety: "safe" | "caution" | "dangerous";
  safetyLabel: string;
  description: string;
}

const FIELDS: FieldDef[] = [
  { key: "name", label: "Name", safety: "safe", safetyLabel: "✅ Safe", description: "Session display name" },
  { key: "cwd", label: "CWD", safety: "caution", safetyLabel: "⚠️ Caution", description: "Working directory" },
  { key: "id", label: "ID", safety: "dangerous", safetyLabel: "🔴 Dangerous", description: "Must match folder name" },
  { key: "summary_count", label: "Summaries", safety: "caution", safetyLabel: "⚠️ Caution", description: "Checkpoint count" },
  { key: "user_named", label: "User Named", safety: "safe", safetyLabel: "✅ Safe", description: "Auto vs manual name" },
  { key: "created_at", label: "Created", safety: "safe", safetyLabel: "✅ Safe", description: "Creation timestamp" },
  { key: "updated_at", label: "Updated", safety: "safe", safetyLabel: "✅ Safe", description: "Last update timestamp" },
];

export function MetadataEditor({ workspace, disabled }: MetadataEditorProps) {
  const [selectedIndex, setSelectedIndex] = React.useState(0);

  useInput(
    (_input, key) => {
      if (disabled) return;
      if (key.upArrow) {
        setSelectedIndex((p) => Math.max(0, p - 1));
      } else if (key.downArrow) {
        setSelectedIndex((p) => Math.min(FIELDS.length - 1, p + 1));
      }
    }
  );

  return (
    <Box flexDirection="column">
      <Box paddingLeft={1}>
        <Text bold color="cyan">{" workspace.yaml"}</Text>
        <Text color="gray" dimColor>{"  (read-only view)"}</Text>
      </Box>
      <Box>
        <Text color="gray" dimColor>{"─".repeat(80)}</Text>
      </Box>
      {FIELDS.map((field, i) => {
        const isSelected = i === selectedIndex;
        const value = String(workspace[field.key] ?? "");
        const safetyColor = field.safety === "safe" ? "green" : field.safety === "caution" ? "yellow" : "red";
        return (
          <Box key={field.key}>
            <Text color={isSelected ? "blue" : "gray"}>
              {isSelected ? " ▸ " : "   "}
            </Text>
            <Text color={safetyColor}>{field.safetyLabel.padEnd(14)}</Text>
            <Text bold={isSelected} color={isSelected ? "white" : undefined}>
              {field.label.padEnd(12)}
            </Text>
            <Text>{value}</Text>
          </Box>
        );
      })}

      {/* Description of selected field */}
      <Box>
        <Text color="gray" dimColor>{"─".repeat(80)}</Text>
      </Box>
      <Box paddingLeft={1}>
        <Text color="gray">{" "}{FIELDS[selectedIndex]?.description ?? ""}</Text>
      </Box>
    </Box>
  );
}
