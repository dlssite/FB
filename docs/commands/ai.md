# 🧠 Cognitive Engine

The Cognitive Engine provides advanced, context-aware AI orchestration, natural language interfaces, persona management, and smart chat moderation triage.

## 🗣️ Interacting with AI

Users can engage with the Cognitive Engine simply by mentioning {{botName}} in a designated AI channel or replying directly to its messages.
- **Context-Aware**: The engine maintains conversational memory within the active thread or channel.
- **Action Routing**: Capable of interpreting intent to trigger smart bot actions (e.g., answering FAQs, analyzing images).

## 🎛️ AI Configuration Commands

All AI management commands are subcommands of **`/ai`**.

### `/ai persona <name>`
Switches the active persona or system prompt used by the AI in the current channel (e.g., Default, Sarcastic, Tutor, Tech Support).
- **Usage**: `/ai persona <name>`
- **Permission**: `ManageChannels`

### `/ai stats`
Displays token usage telemetry, active context threads, average response latency, and LLM model status.
- **Usage**: `/ai stats`

### `/ai settings`
Configures AI engagement cooldowns, max context token limits, and allowed channels.
- **Permission**: `ManageGuild`
