# 🔥 Advanced Streaks

The Streak Masteries module tracks daily activity, rewarding consistent players with compounding economy and XP multipliers, freeze protection, and leaderboards.

## 👥 Streak Commands

All streak commands are subcommands of **`/streak`**.

### `/streak claim`
Claims your daily streak check-in, increasing your current count and awarding daily bonuses.
- **Prefix**: `$streak claim` or `$daily` (when linked)

### `/streak info [user]`
Displays current streak count, active multiplier bonuses, remaining time before expiration, and available Streak Freezes.
- **Prefix**: `$streak info` or `$streak`

### `/streak leaderboard`
Ranks the top players in the server by their active daily streak count.
- **Prefix**: `$streak lb`

## 🛠️ Administrative Commands

### `/streak manage <user> <action>`
Allows staff to adjust a user's streak count or grant emergency Streak Freezes.
- **Permission**: `ManageGuild`
- **Actions**: `set`, `add`, `reset`, `give_freeze`
