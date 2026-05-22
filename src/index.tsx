#!/usr/bin/env node
import React from "react";
import { render } from "ink";
import { Command } from "commander";
import { App } from "./app.js";
import { getDefaultSessionDir } from "./utils/format.js";

const program = new Command();

program
  .name("session-repair")
  .description(
    "DOSShell-style TUI tool for browsing, inspecting, and repairing GitHub Copilot CLI session databases"
  )
  .option(
    "--dir <path>",
    "Session state directory to scan",
    getDefaultSessionDir()
  )
  .option("--session <id>", "Open a specific session by UUID directly")
  .action((opts) => {
    const sessionDir: string = opts.dir;
    const sessionId: string | undefined = opts.session;

    // Enter alternate screen buffer for clean full-screen rendering
    process.stdout.write("\x1b[?1049h");
    process.stdout.write("\x1b[2J\x1b[H");

    const instance = render(
      <App sessionDir={sessionDir} initialSessionId={sessionId} />
    );

    instance.waitUntilExit().then(() => {
      // Restore main screen buffer on exit
      process.stdout.write("\x1b[?1049l");
    });
  });

program.parse();
