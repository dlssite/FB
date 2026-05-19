# 🎁 Advanced Giveaways

The Giveaway module allows staff to host interactive giveaways with custom role requirements, multipliers, and flash drops.

## 🛠️ Administrative Commands

All giveaway commands are subcommands of **`/giveaway`**.
- **Permission**: `ManageEvents` or `ManageGuild` is required for all commands.

### `/giveaway start`
Launches a new interactive giveaway in the current channel.
- **Parameters**: Duration, Winner Count, Prize, and optional Role Requirements.

### `/giveaway end <message_id>`
Prematurely ends an active giveaway and immediately rolls the winners.
- **Usage**: `/giveaway end <message_id>`

### `/giveaway reroll <message_id>`
Rerolls the winners of a completed giveaway.
- **Usage**: `/giveaway reroll <message_id>`

### `/giveaway cancel <message_id>`
Cancels an active giveaway without picking any winners.
- **Usage**: `/giveaway cancel <message_id>`

### `/giveaway drop`
Initiates a "Flash Drop" — the first user to click the interactive button claims the prize.
- **Usage**: `/giveaway drop <prize>`
