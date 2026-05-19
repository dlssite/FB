# 🛡️ Smart Verification

Smart Verification secures your server against automated bots and raiders using interactive CAPTCHAs, custom rule agreements, and panic lockdowns.

## 🛠️ Administrative Commands

All verification management commands are subcommands of **`/verification`**.
- **Permission**: `ManageGuild` is required for all setup and moderation commands.

### `/verification send`
Deploys the interactive Verification Gate panel to the current channel.
- **Usage**: `/verification send`

### `/verification config` & `/verification edit`
Configures verification modes (Button, CAPTCHA, Passcode), verified roles, and log channels.
- **Usage**: `/verification config`, `/verification edit`

### `/verification rules`
Sets up the server rules that users must accept before gaining entry.
- **Usage**: `/verification rules`

### `/verification role`
Assigns which role is granted upon successful verification.
- **Usage**: `/verification role <role>`

### `/verification unverify <user>`
Revokes a user's verified status and removes their verified role.
- **Usage**: `/verification unverify <user>`

### `/verification panic`
Toggles **Panic Mode**, temporarily locking down the verification gate to block incoming raids.
- **Usage**: `/verification panic`

### `/verification codes`, `/verification group`, `/verification list`, `/verification view`
Advanced management of one-time verification passcodes and verification groups.
