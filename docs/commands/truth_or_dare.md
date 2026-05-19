# 🎭 Truth or Dare

The Truth or Dare module is a high-fidelity social game engine featuring interactive Arena panels, solo prompts, and the "Royal Spin" multiplayer mode.

## 🎲 Gameplay Commands

All truth or dare commands are subcommands of **`/tod`**.
💡 **Prefix Support**: You can also use `$tod`, `$truth`, `$dare`, etc. (using your server's prefix).

### `/tod play`
Launches the **Royal Spin** multiplayer lobby. Players join via interactive buttons before a virtual bottle spins to select the chosen one.
- **Prefix**: `$tod play`

### `/tod single [type]`
Requests an instant, solo Truth or Dare prompt.
- **Prefix**: `$truth`, `$dare`, `$random`

### `/tod stats [user]`
Displays completed truths, dares, forfeits, and bottle spin victories for a user.
- **Prefix**: `$tod stats`

## 🛠️ Administrative Commands

### `/tod panel`
Deploys a permanent, interactive **Truth or Dare Arena Panel** to the current channel.
- **Permission**: `ManageChannels`

### `/tod setup`
Configures custom prompt categories, rating filters (PG/R), and active game channels.
- **Permission**: `ManageGuild`
