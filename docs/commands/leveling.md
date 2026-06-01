# 🧬 Neural Progression Guide

Welcome to the Flameborn Neural Progression system. This module tracks your engagement and rewards consistent synchronization with the network through levels, prestige, and unique role rewards.

## 👤 User Commands
- **`/rank`** (Alias: `!rank`, `!lvl`): View your current neural status, level, and XP progress.
- **`/leaderboard`** (Alias: `!lb`, `!top`): View the most synchronized citizens in the server.
- **`/level list`** (Alias: `!rewards`): View the server's level-to-role progression path.
- **`/level ascend`**: Reach Level 100 to reset your level and gain permanent Prestige markers.

## 🛠️ Administrative Commands
- **`/level manage`** (Alias: `!setxp`, `!setlvl`): Manually override a citizen's Level or XP.
- **`/level reset`**: Reset all server leveling XP, levels, and prestige for every citizen.
- **`/level toggle`** (Alias: `!leveltoggle`): Enable or disable the leveling engine.
- **`/level settings`**: Configure global settings like the Top Leveler role and role stacking.
- **`/level roles`**: Map specific levels to Discord roles.
- **`/level blacklist`**: Prevent XP gain in specific channels or for certain roles.
- **`/level hotspot`**: Set XP multipliers (e.g., 2x XP) for high-quality channels.

## ⚙️ How it Works
- **Neural Pulse**: You gain XP every 60 seconds of active conversation.
- **Anti-Spam**: Short, repetitive messages grant significantly less (or zero) XP.
- **Role Rewards**: As you level up, the bot can automatically grant you new roles. By default, new roles replace old ones to keep your profile clean.
- **Prestige**: Once you hit the Level 100 cap, you can "Ascend" to reset to Level 1 but increase your Prestige rank, marking you as an elite citizen.
