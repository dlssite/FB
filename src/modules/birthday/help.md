# 🎂 Birthday Celebration Module

Automate server-wide birthday celebrations with custom announcement cards, role rewards, and interactive gift systems.

## Features
- **Immersive Announcement Cards**: High-fidelity graphical cards featuring user avatars and server branding.
- **Interactive Gift System**: Birthday people can claim "Embers" (Economy) directly from the announcement card.
- **Community Engagement**: Integrated "Send a Wish" system where users can write personal messages to the celebrant.
- **Automated Roles**: Grant special temporary roles to users on their birthday.
- **Customizable Messaging**: Supports placeholders like `{user}`, `{age}`, and `{zodiac}`.

## Commands

### Slash Commands
| Command | Description |
|---------|-------------|
| `/birthday set [day] [month]` | Set your birthday in the server registry. |
| `/birthday check [@user]` | View a user's birthday and zodiac sign. |
| `/birthday list` | View all birthdays registered in the server. |
| `/birthday remove` | Remove your birthday from the server registry. |
| `/birthday wishes [@user]` | View all wishes received by a user this year. |
| `/birthday setting` | (Admin) Configure announcement channel, roles, and bonuses. |
| `/birthday test` | (Admin) Send a live preview of the birthday card. |

### Prefix Commands (Aliases)
- `!bday` / `!birthday` -> Check birthday
- `!setbirthday` -> Register birthday
- `!bdaylist` -> View all birthdays
- `!wishes` -> View received wishes
- `!bdaytest` -> (Admin) Trigger test card

## Configuration Options
- **Channel**: Where the birthday announcements will be sent.
- **Message**: Custom text for the announcement (Supports Markdown).
- **Birthday Role**: A role granted to the user for 24 hours.
- **Ping Role**: A role mentioned in the announcement (e.g., @Everyone or @Subscribers).
- **Bonus Embers**: Amount of economy currency given to the user.
- **Banner URL**: Custom background image for the announcement card.
- **Show Age**: Toggle whether to display the user's age.

## Placeholders
- `{user}`: Mentions the birthday person.
- `{age}`: Displays the user's current age (if year provided).
- `{zodiac}`: Displays the user's zodiac sign and icon.

---
© Flameborn Celebration Moment
