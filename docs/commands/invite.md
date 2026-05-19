# 📈 Advanced Invite Tracker

The Invite Tracker provides accurate, real-time attribution for member joins, fake account detection, and invite leaderboards.

## 👥 User Commands

All invite commands are subcommands of **`/invite`**.

### `/invite stats [user]`
View detailed invite statistics (Regular, Leaves, Fakes, Bonus, and Net total) for yourself or another member.
- **Usage**: `/invite stats [user]`

### `/invite leaderboard`
Displays the top inviters in the server ranked by Net Invites.
- **Usage**: `/invite leaderboard`

### `/invite inviter [user]`
Checks who invited a specific member, including the exact invite code used and their join timestamp.
- **Usage**: `/invite inviter [user]`

## 🛠️ Administrative Commands

### `/invite bonus <user> <amount>`
Grants or removes bonus invites for a member.
- **Permission**: `ManageGuild`
- **Usage**: `/invite bonus <user> <amount>` (use negative numbers to deduct)

### `/invite settings`
Configures fake account detection thresholds (e.g., minimum account age) and log channels.
- **Permission**: `ManageGuild`
