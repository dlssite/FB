# 🎫 Support Tickets

The Support Ticket system offers highly configurable, multi-panel customer service queues with smart transcripts and AI triage.

## 👥 User & Staff Commands

All ticket management commands are subcommands of **`/ticket`**.

### `/ticket add`
Adds a specific user or role to the current ticket thread.
- **Usage**: `/ticket add <target>`

### `/ticket claim`
Claims the current ticket, assigning you as the dedicated support operative.
- **Permission**: Support Staff

### `/ticket close`
Closes the ticket, generating a secure transcript and logging the interaction.
- **Usage**: `/ticket close [reason]`

### `/ticket remove`
Removes a specific user or role from the current ticket thread.
- **Usage**: `/ticket remove <target>`

## 🛠️ Administrative Commands

### `/ticket panelCreate`
Deploys a fully interactive Support Ticket Panel to the current channel.
- **Permission**: `ManageGuild`
- **Configuration**: Supports custom titles, descriptions, and dropdown categories.

### `/ticket optionAdd`
Adds a new support category (e.g., Billing, Bug Report, General Inquiry) to an existing ticket panel.
- **Permission**: `ManageGuild`
