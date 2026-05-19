# ⚙️ Core System

The Core System manages bot heartbeats, internationalization, performance metrics, and command routing.

## 🤖 Bot Commands

All core bot commands are subcommands of **`/bot`**.
💡 **Prefix Support**: You can also use `$ping`, `$about`, `$stats`, etc. (using your server's prefix).

### `/bot about`
Displays detailed information about {{botName}}, its architects, and system version.
- **Prefix**: `$about`

### `/bot lang`
Configures the bot's language for the current server or user.
- **Prefix**: `$lang <language>`
- **Permission**: `ManageGuild` (for server-wide changes)

### `/bot ping`
Checks the neural latency between {{botName}}, Discord's gateway, and the database shards.
- **Prefix**: `$ping`

### `/bot prefix`
Customizes the command prefix used for legacy shorthand commands in this server.
- **Prefix**: `$prefix <new_prefix>`
- **Permission**: `ManageGuild`

### `/bot stats`
Displays real-time system telemetry, memory usage, uptime, and active shard status.
- **Prefix**: `$stats`
