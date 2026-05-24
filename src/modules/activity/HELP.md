Activity Module — Activity Logger

This module exposes the `/activity` command with a `log` subcommand group to configure activity logging.

Commands

- `/activity log channel scope:<bot|server> channel:<#channel>`
  - Sets the destination channel for the selected log scope.

- `/activity log type scope:<bot|server> log_type:<type> enabled:<true|false>`
  - Enables or disables a specific log type for the selected scope.
  - Supported types: `command`, `member_join`, `member_leave`, `member_update`, `voice_state`, `message_delete`.

- `/activity log status`
  - Shows current configured channels and enabled log types.

Examples

- Route bot command logs to a channel named `#bot-logs`:

  /activity log channel scope:bot channel:#bot-logs

- Enable member join events in server logs:

  /activity log type scope:server log_type:member_join enabled:true

- View current logger configuration:

  /activity log status

Notes

- Only users with `Manage Server` permission can change configuration.
- After changing channels or types, the logger will persist settings to the server settings table via Prisma.
