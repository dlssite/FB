# 🤖 Unified Action Engine (Auto)

The `Auto` module provides advanced, context-aware automated responses and reactions for your server. It completely replaces standard "auto-reply" bots by offering hybrid actions, multi-response roulette, and dynamic mechanics like probability chances.

## 🛠️ Management Commands

`{{botName}}` requires the **Manage Server** permission to configure the action engine.

### `/auto create <name> <trigger> [match_type]`
Initializes a new trigger in the system.
- **name**: A recognizable label for your trigger (e.g., `Welcome Greeting`).
- **trigger**: The word, phrase, or pattern to match against.
- **match_type**: How the trigger evaluates incoming messages:
  - `Contains Word` (Default): Matches if the exact word is found anywhere in the sentence.
  - `Exact Match`: The message must match the trigger text perfectly.
  - `Starts With`: The message must begin with the trigger text.
  - `Advanced RegEx`: Use a custom Regular Expression pattern.

### `/auto set-reply <name> <reply> [media_url] [use_embed]`
Adds a text response to the trigger.
> [!TIP]
> **Multi-Response Roulette:** You can run this command multiple times on the same trigger to add different reply variants. `{{botName}}` will automatically pick one at random each time the trigger fires!

### `/auto set-react <name> <emoji>`
Appends a reaction to the trigger. `{{botName}}` will drop this emoji on any message that matches the trigger. You can add multiple reactions by running this command multiple times.

### `/auto settings <name> [chance] [cooldown] [add_channel] [add_role]`
Unlocks advanced mechanics and filters for the trigger:
- **chance**: Set a 1-100% execution probability. (e.g., A 5% chance makes the trigger a rare Easter egg).
- **cooldown**: Prevent spam by setting a per-user cooldown in seconds.
- **add_channel**: Restricts the trigger to only execute in a specific channel.
- **add_role**: Requires the user to hold a specific role to activate the trigger.

### `/auto list`
Displays a comprehensive, paginated summary of all active triggers configured for this server, including their current logic and variants.

### `/auto remove <name>`
Permanently deletes a trigger and all associated replies and reactions from the server's action engine cache.
