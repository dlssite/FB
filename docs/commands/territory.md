# 🌍 World Engine (Territory)

The World Engine manages the server's geography, nations, and geographic resource registries. It allows staff to define specific Discord categories as "Nations" with unique properties.

## 👥 Player Commands

### `/territory info`
Displays detailed information about the territory you are currently in.
- **Details**: Shows Nation name, primary resource, and access requirements.
- **Usage**: Just run it in any channel within a Nation.

### `/territory list`
Lists all registered Nations in the server.
- **Details**: Provides a directory of all nations and their primary resources.

## 🛠️ Staff Commands (Admin Only)

### `/territory register`
Registers a Discord Category as a Nation.
- **Options**:
  - `category`: The category to map.
  - `name`: Display name for the Nation.
  - `access_role`: Role required to enter.
  - `resource`: Resource available for mining (e.g., Gold, Lithium).
  - `price`: Base market price for the resource.
  - `image`: Banner image URL.
  - `patron_role`: Owner/Patron role.
  - `ban_role`: Role for exiling users.
  - `log_channel`: Where territory logs are sent.
  - `arrival_channel`: Where arrival notifications are sent.

### `/territory edit`
Update an existing Nation's configuration.
- **Details**: Allows you to change specific fields (like the resource or banner) without re-registering everything.

### `/territory remove`
Deletes a Nation registration.
- **Details**: Unmaps the category from the World Engine.
