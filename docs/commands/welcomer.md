# 👋 Welcome Gate

The Welcome Gate handles beautiful, customized entrance and exit cards for incoming and departing community members.

## 🛠️ Administrative Commands

All welcome configuration commands are subcommands of **`/welcome`**.
- **Permission**: `ManageGuild` is required for all setup commands.

### `/welcome setup`
Configures the primary welcome channel and greeting message.
- **Usage**: `/welcome setup <channel> [message]`
- **Variables**: Supports `{user}`, `{server}`, and `{memberCount}` tags.

### `/welcome toggle`
Enables or disables welcome/leave announcements for the server.
- **Usage**: `/welcome toggle`

### `/welcome image`
Sets a custom background image URL for the generated welcome canvas cards.
- **Usage**: `/welcome image <url>`

### `/welcome color`
Customizes the accent hex color used on the welcome canvas text and borders.
- **Usage**: `/welcome color <hex_code>`

### `/welcome test`
Simulates a new member join to preview your welcome card and embed configuration.
- **Usage**: `/welcome test`
