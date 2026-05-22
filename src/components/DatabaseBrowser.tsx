import React from "react";
import { Box, Text, useInput } from "ink";
import type { TableInfo } from "../parsers/database.js";

interface DatabaseBrowserProps {
  tables: TableInfo[];
  disabled?: boolean;
}

export function DatabaseBrowser({ tables, disabled }: DatabaseBrowserProps) {
  const [selectedIndex, setSelectedIndex] = React.useState(0);

  useInput(
    (_input, key) => {
      if (disabled) return;
      if (key.upArrow) {
        setSelectedIndex((p) => Math.max(0, p - 1));
      } else if (key.downArrow) {
        setSelectedIndex((p) => Math.min(tables.length - 1, p + 1));
      }
    }
  );

  const selected = tables[selectedIndex];

  return (
    <Box flexDirection="column">
      <Box paddingLeft={1}>
        <Text bold color="cyan">{" session.db"}</Text>
        <Text color="gray" dimColor>{"  SQLite Database"}</Text>
      </Box>
      <Box>
        <Text color="gray" dimColor>{"─".repeat(80)}</Text>
      </Box>

      {tables.length === 0 && (
        <Box paddingLeft={2}>
          <Text color="yellow">No database found or better-sqlite3 not installed.</Text>
        </Box>
      )}

      {tables.map((table, i) => {
        const isSelected = i === selectedIndex;
        return (
          <Box key={table.name}>
            <Text color={isSelected ? "blue" : "gray"}>
              {isSelected ? " ▸ " : "   "}
            </Text>
            <Text bold={isSelected} color={isSelected ? "white" : undefined}>
              {"🗃 "}{table.name.padEnd(20)}
            </Text>
            <Text color="gray" dimColor>
              {table.rowCount} row{table.rowCount !== 1 ? "s" : ""}{" │ "}
              {table.columns.length} column{table.columns.length !== 1 ? "s" : ""}
            </Text>
          </Box>
        );
      })}

      {/* Schema for selected table */}
      {selected && (
        <>
          <Box>
            <Text color="gray" dimColor>{"─".repeat(80)}</Text>
          </Box>
          <Box paddingLeft={1} flexDirection="column">
            <Box>
              <Text color="gray">{" Schema: "}</Text>
              <Text bold>{selected.name}</Text>
            </Box>
            {selected.columns.map((col) => (
              <Box key={col.name} paddingLeft={3}>
                <Text color={col.pk ? "yellow" : "white"}>
                  {col.pk ? "🔑 " : "   "}
                  {col.name.padEnd(25)}
                </Text>
                <Text color="gray">
                  {col.type.padEnd(12)}
                </Text>
                <Text color={col.notnull ? "red" : "green"}>
                  {col.notnull ? "NOT NULL" : "nullable"}
                </Text>
                {col.defaultValue && (
                  <Text color="gray" dimColor>
                    {"  default: "}{col.defaultValue}
                  </Text>
                )}
              </Box>
            ))}
          </Box>
        </>
      )}
    </Box>
  );
}
