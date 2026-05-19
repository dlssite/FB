# 💠 Advanced Economy

The Flameborn Economy is a dynamic, territorial system driven by player activity and market simulations.

## 👥 Player Commands

All economy commands are subcommands of **`/economy`**. 
💡 **Prefix Support**: You can also use `$work`, `$bal`, `$mine`, etc. (using your server's prefix).

### `/economy mine`
Extract resources from the current territory.
- **Prefix**: `$mine`
- **Requirements**: Must be inside a registered Nation.
- **Charges**: 2 extractions per day.

### `/economy prices`
View live valuations of all resources. 
- **Prefix**: `$prices`

### `/economy buy` & `/economy sell`
Trade resources for Embers. 
- **Prefix**: `$buy <resource> <amount>`, `$sell <resource> <amount>`

### `/economy balance`
Check your liquid Embers, Rubies, and Vault savings.
- **Prefix**: `$bal`

### `/economy profile`
View your advanced profile and **Net Worth**.
- **Prefix**: `$profile` or `$me`

### `/economy inventory`
View your stockpile of resources.
- **Prefix**: `$inv`

### `/economy career`
Select a specialization.
- **Prefix**: `$career`

### `/economy daily`
Claim your daily Ember stipend.
- **Prefix**: `$daily`

### `/economy work`
Perform a shift in the industrial sector.
- **Prefix**: `$work`

### `/economy hack`
Neural breach: Attempt to exploit another user's cyber-deck.
- **Prefix**: `$hack <user>`
- **Mechanic**: Neural based scenarios with fixed exploit rewards.
- **⚠️ Warning**: Targeting the **Flameborn Core** (the bot) is technically possible but carries extreme risk of sentient retribution.

### `/economy rob`
Attempt to steal from another user.
- **Prefix**: `$rob <user>`
- **Mechanic**: Includes random "Opportunities" for high-stakes gambling.
- **Consequence**: Failing results in a significant fine.
- **⚠️ Warning**: Robbing the **Architect** is a 5% success gamble with a 50% net worth penalty.

## 🛠️ Staff Commands (Admin Only)

### `/economy settings mining_role`
Configure which role is used for mining operations.
- **Permission**: `ManageGuild`

### `/economy give <user> <amount>`
Grant embers to a specific user.
- **Prefix**: `$give`
- **Permission**: `ManageGuild`

### `/economy remove <user> <amount>`
Deduct embers from a specific user.
- **Prefix**: `$remove` | `$take`
- **Permission**: `ManageGuild`

### `/economy set <user> <amount>`
Set a user's balance to an exact amount.
- **Prefix**: `$setbal`
- **Permission**: `ManageGuild`
