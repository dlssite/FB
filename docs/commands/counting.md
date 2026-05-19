# 🔢 Smart Counting Minigame

The Smart Counting Minigame is a highly engaging sequential counting channel featuring math expression parsing, cursed numbers, temporal saves, and hall of shames.

## 📈 Gameplay Mechanics

Players participate simply by typing the next sequential number (or a valid mathematical expression like `2+2`, `5*5`, `100/2`) in the designated counting channel.
- **Saves**: Protects the server's streak from an accidental typo.
- **Cursed Numbers**: Special milestone numbers that trigger unpredictable mini-events.
- **Consequences**: Breaking the count resets the server streak to 0 and adds the culprit to the Hall of Shame.

## 📊 Statistics & Leaderboards

All counting commands are subcommands of **`/counting`**.

### `/counting stats`
Displays the current server streak, highest historical streak, total numbers counted, and active saves.
- **Prefix**: `$counting stats`

### `/counting leaderboard`
Ranks top contributors by their correct counts and highest streaks.
- **Prefix**: `$counting lb`

### `/counting shames`
Displays the **Hall of Shame** — members who have broken the highest streaks.
- **Prefix**: `$counting shames`

## 🛠️ Administrative Commands

### `/counting setup <channel>`
Initializes or updates the dedicated counting channel.
- **Permission**: `ManageChannels`

### `/counting reset`
Forcibly resets the current counting streak or adjusts available server saves.
- **Permission**: `ManageGuild`
