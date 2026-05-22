import React from "react";
import { Box, Text } from "ink";

export type TabId = "events" | "checkpoints" | "database" | "metadata" | "repair";

interface TabBarProps {
  activeTab: TabId;
  counts?: Partial<Record<TabId, number>>;
}

const TABS: { id: TabId; label: string; key: string }[] = [
  { id: "events", label: "Events", key: "1" },
  { id: "checkpoints", label: "Checkpoints", key: "2" },
  { id: "database", label: "Database", key: "3" },
  { id: "metadata", label: "Metadata", key: "4" },
  { id: "repair", label: "Repair", key: "5" },
];

export function TabBar({ activeTab, counts }: TabBarProps) {
  return (
    <Box>
      <Text color="gray">{" "}</Text>
      {TABS.map((tab, i) => {
        const isActive = tab.id === activeTab;
        const count = counts?.[tab.id];
        return (
          <React.Fragment key={tab.id}>
            {i > 0 && <Text color="gray">{" │ "}</Text>}
            <Text color={isActive ? "blue" : "gray"} bold={isActive} underline={isActive}>
              {tab.key}
            </Text>
            <Text color={isActive ? "white" : "gray"}>
              {" "}{tab.label}
            </Text>
            {count !== undefined && (
              <Text color="gray" dimColor>
                {` (${count})`}
              </Text>
            )}
          </React.Fragment>
        );
      })}
    </Box>
  );
}
