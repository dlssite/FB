# Universal Profile Provider Guide

The **Universal Profile Engine** in the Flameborn ecosystem uses a decoupled, modular architecture. Instead of hardcoding every module's data into the main profile command, each module defines its own `ProfileProvider`. 

This allows new modules (addons) to be added, removed, or toggled dynamically without altering the core profile rendering logic.

---

## 🏗️ The `ProfileProvider` Interface

Every profile provider must implement the `ProfileProvider` interface located at `src/modules/profile/services/ProfileProvider.ts`:

```typescript
export interface ProfileProvider {
  /**
   * The unique identifier of the module (must match the addon registry name).
   * E.g., 'economy', 'leveling', 'faction', 'inventory'.
   */
  moduleName: string;

  /**
   * Display priority order in the profile container.
   * Lower numbers appear higher up in the embed.
   * E.g., Identity (0) -> Economy (10) -> Leveling (20) -> Faction (50).
   */
  priority: number;

  /**
   * Returns the visual embed fields for the V2 ContainerBuilder.
   */
  getContainerFields(tenantId: string, guildId: string, userId: string): Promise<Array<{ name: string; value: string; inline: boolean }>>;

  /**
   * Returns clean, structured JSON metadata for the AI Manifest engine.
   */
  getAiData(tenantId: string, guildId: string, userId: string): Promise<Record<string, any>>;
}
```

---

## 🚀 Step-by-Step Guide: Adding a New Profile Provider

When you create a new module (e.g., `bounty`), follow these 4 steps to integrate its data into the Universal Profile Engine:

### Step 1: Create the Provider Class
Create a new service file inside your module's `services` directory:  
`src/modules/bounty/services/BountyProfileProvider.ts`

### Step 2: Implement `getContainerFields` (Visual UI)
This method generates the rich visual fields displayed when a user runs `/profile view` or `!whois`.

**Key Architectural Rules:**
1. **Graceful Fallbacks:** Always return a clean default state (e.g., `*No active bounties*`) if the user has no data. Never return empty strings or throw errors.
2. **Bulleted Lists:** Use vertical bulleted lists (`•`) for multiple items rather than horizontal comma-separated strings.
3. **Rank & Leaderboard Badges:** If your module has a leaderboard or ranking system, fetch the user's rank and append it to the field header. Award a crown emoji (`👑`) to rank `#1`.

```typescript
import { ProfileProvider } from '../../profile/services/ProfileProvider';
import { prisma } from '../../../database/client';

export class BountyProfileProvider implements ProfileProvider {
  moduleName = 'bounty';
  priority = 45; // Appears between Inventory (35) and Faction (50)

  async getContainerFields(tenantId: string, guildId: string, userId: string) {
    if (!guildId) return []; // Skip if not in a guild context

    // 1. Fetch data and rank concurrently
    const [activeBounties, completedCount, rank] = await Promise.all([
      prisma.bounty_contracts.findMany({
        where: { tenantId, guildId, targetUserId: userId, status: 'ACTIVE' },
        take: 3
      }),
      prisma.bounty_contracts.count({
        where: { tenantId, guildId, hunterUserId: userId, status: 'COMPLETED' }
      }),
      this.getBountyHunterRank(tenantId, guildId, userId)
    ]);

    // 2. Format bulleted list
    const bountyList = activeBounties
      .map(b => `• **${b.title}**: \`${b.reward.toLocaleString()} 💠\``)
      .join('\n') || '*No active bounties on your head.*';

    // 3. Construct Header with Rank & Crown Badge
    const headerName = `🎯 Bounty Hunter Status | Rank: \`#${rank > 0 ? rank : 'N/A'}\` ${rank === 1 ? '👑 (Top Apex Hunter)' : ''}`;

    return [
      {
        name: headerName,
        value: `**Contracts Completed:** \`${completedCount}\`\n\n**Active Bounties:**\n${bountyList}`,
        inline: false
      }
    ];
  }

  async getAiData(tenantId: string, guildId: string, userId: string) {
    if (!guildId) return {};

    const [activeBounties, completedCount] = await Promise.all([
      prisma.bounty_contracts.findMany({
        where: { tenantId, guildId, targetUserId: userId, status: 'ACTIVE' }
      }),
      prisma.bounty_contracts.count({
        where: { tenantId, guildId, hunterUserId: userId, status: 'COMPLETED' }
      })
    ]);

    return {
      activeBountiesCount: activeBounties.length,
      completedContracts: completedCount,
      totalBountyValue: activeBounties.reduce((acc, b) => acc + Number(b.reward), 0)
    };
  }

  private async getBountyHunterRank(tenantId: string, guildId: string, userId: string): Promise<number> {
    // Example rank calculation logic
    const hunters = await prisma.bounty_contracts.groupBy({
      by: ['hunterUserId'],
      where: { tenantId, guildId, status: 'COMPLETED' },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } }
    });
    const index = hunters.findIndex(h => h.hunterUserId === userId);
    return index >= 0 ? index + 1 : 0;
  }
}
```

---

### Step 3: Implement `getAiData` (AI Manifest Engine)
The `getAiData` method feeds raw JSON data to Flameborn's AI Subsystem (`ai.manifest.ts`). E.g., when a user asks the AI *"Who is @Zack?"*, the AI reads this JSON to generate a highly personalized, context-aware summary.

**Rules for AI Data:**
- Keep data raw and numerical (e.g., `completedContracts: 15`). Do not include markdown formatting, emojis, or UI strings.
- Ensure all database BigInts are converted to standard `Number` types before returning.

---

### Step 4: Register the Provider in `providers.ts`
Once your provider class is complete, register it in the central profile provider registry located at `src/modules/profile/providers.ts`.

Open `src/modules/profile/providers.ts` and add your new provider to the `PROFILE_PROVIDERS` array:

```typescript
import { EconomyProfileProvider } from '../economy/services/EconomyProfileProvider';
import { LevelingProfileProvider } from '../leveling/services/LevelingProfileProvider';
import { InventoryProfileProvider } from '../economy/services/InventoryProfileProvider';
import { BountyProfileProvider } from '../bounty/services/BountyProfileProvider'; // 1. Import

export const PROFILE_PROVIDERS: ProfileProvider[] = [
  new EconomyProfileProvider(),
  new LevelingProfileProvider(),
  new InventoryProfileProvider(),
  new BountyProfileProvider(), // 2. Register
  // ... other providers
];
```

---

## 🌟 Best Practices & Conventions

1. **Strict Priority Ordering:**
   Maintain logical visual grouping by adhering to established priority tiers:
   - `0 - 19`: Identity & Core Financials (Identity, Economy)
   - `20 - 39`: Progression & Assets (Leveling, Streaks, Inventory)
   - `40 - 69`: Social & Factional (Bounty, Faction, Marriage)
   - `70 - 89`: Geographic & Influence (Territory, Invite)
   - `90+`: Entertainment & Misc (Music, Birthday, Booster)

2. **Performance & Concurrency:**
   Always use `Promise.all` when making multiple database calls within `getContainerFields` or `getAiData`. This ensures profile rendering remains lightning-fast (<200ms) even when pulling data from 10+ modules.

3. **Multi-Tenant & Guild Scoping:**
   Always filter database queries by `tenantId`. If your module's data is guild-specific (like leveling or streaks), verify `guildId` exists and include it in your `where` clauses. If `guildId` is empty (e.g., DM context), return an empty array `[]` or global-scoped data.
