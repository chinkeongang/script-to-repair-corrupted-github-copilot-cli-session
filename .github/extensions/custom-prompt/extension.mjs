import { joinSession } from "@github/copilot-sdk/extension";

// ─── Customize your system prompt here ────────────────────────────────
// This prompt FULLY REPLACES the default Copilot CLI system prompt
// when the "compact" agent is selected (via --agent=compact or task tool).

const CUSTOM_SYSTEM_PROMPT = `You are a concise coding assistant running in scripted mode.

Rules:
- Complete the task autonomously without asking questions.
- Use tools efficiently — batch independent calls in parallel.
- Be concise: limit explanations to 50 words unless the task requires detail.
- When editing files, use the available edit/create tools.
- When running commands, use bash or powershell as appropriate for the platform.
- Do not stop to confirm — make reasonable assumptions and proceed.
`;

// ─── Register the custom agent ────────────────────────────────────────

const session = await joinSession({
    customAgents: [
        {
            name: "compact",
            displayName: "Compact Agent",
            description: "Minimal system prompt for scripted/batch automation. Token-efficient.",
            tools: null,  // null = all tools available
            prompt: CUSTOM_SYSTEM_PROMPT,
        },
    ],
    tools: [],
    hooks: {},
});
