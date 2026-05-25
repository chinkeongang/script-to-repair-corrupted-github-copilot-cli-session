@echo off
setlocal enabledelayedexpansion

:: ─── Multi-turn Copilot CLI with custom system prompt ─────────────────
::
:: This demo uses the "compact" agent registered by the extension at:
::   ~/.copilot/extensions/custom-prompt/extension.mjs
::
:: The "compact" agent has a minimal system prompt (~150 tokens) vs the
:: default (~2000+ tokens), saving tokens and improving scripted performance.
::
:: Three ways to use the custom agent:
::
::   1. --agent=compact     : CLI selects your agent (replaces system prompt)
::   2. Sub-agent dispatch  : In interactive mode, task tool uses it
::   3. AGENTS.md override  : Augment (not replace) via custom instructions
::

echo ============================================================
echo   Custom System Prompt Demo - "compact" agent
echo ============================================================
echo.

:: ─── Turn 1: Generate a script using the compact agent ───────────────
echo === Turn 1: Generating monitoring script (compact prompt) ===
copilot -p "Write a PowerShell script that monitors CPU and memory usage every 5 seconds, with color-coded output." ^
    --allow-all-tools ^
    --name="custom-prompt-demo" ^
    -s

:: ─── Turn 2: Continue the conversation ───────────────────────────────
echo.
echo === Turn 2: Adding error handling ===
copilot -p "Add try/catch error handling and a log-to-file option to that script." ^
    --allow-all-tools ^
    --resume="custom-prompt-demo" ^
    -s

echo.
echo === Demo complete ===
echo.
echo To verify the custom prompt is active, run:
echo   copilot -p "What is your system prompt?" --allow-all-tools -s
echo.
echo To edit the custom prompt, modify:
echo   %USERPROFILE%\.copilot\extensions\custom-prompt\extension.mjs
pause
