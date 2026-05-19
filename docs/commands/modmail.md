# 📩 Smart Modmail

Smart Modmail provides seamless, thread-based communication between community members and staff, featuring AI triage, snippets, and CSAT ratings.

## 👥 User Experience

Users initiate a Modmail session simply by sending a Direct Message (DM) to {{botName}}. 
- The bot automatically routes the message to a dedicated staff channel or thread.
- Users receive real-time updates and can rate their support experience once the ticket closes.

## 🛡️ Staff Commands (Used inside Modmail Threads)

All staff modmail commands are subcommands of **`/modmail`**.

### `/modmail reply <message>`
Sends an official staff response to the user's DM.
- **Usage**: `/modmail reply <message>`

### `/modmail claim`
Claims the active modmail thread, marking you as the primary handling moderator.
- **Usage**: `/modmail claim`

### `/modmail close [reason]`
Closes the modmail session, archiving the transcript and sending a CSAT rating survey to the user.
- **Usage**: `/modmail close [reason]`

### `/modmail contact <user>`
Proactively opens a new Modmail thread with a specific server member.
- **Usage**: `/modmail contact <user>`

### `/modmail snippet <name>`
Inserts a pre-configured quick response (snippet) into the active thread.
- **Usage**: `/modmail snippet <name>`

## 🛠️ Administrative Setup

### `/modmail setup_config` & `/modmail setup_category`
Configures the primary modmail inbox category, log channels, and automated greeting messages.
- **Permission**: `ManageGuild`
