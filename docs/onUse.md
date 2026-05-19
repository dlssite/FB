# Flameborn Universal Action Engine: `onUse` Guide

The Flameborn ecosystem uses a dynamic Action Engine that allows every item in the marketplace to become an interactive asset. Instead of hardcoding behavior into slash commands, behaviors are attached directly to the item definition via the `onUse` hook.

When a user selects "Use Item" from their Inventory Panel dropdown, the system automatically resolves the specific asset instance and invokes its `onUse` method.

## The Method Signature

To make an item interactive, override the `onUse` method in your class that extends `BaseItem`:

```typescript
import { BaseItem } from '../../engine/BaseItem';
import { ContainerService, replyV2 } from '../../../../utils/container';

export class MyCustomItem extends BaseItem {
  // ... basic item properties ...

  /**
   * Universal Use hook: triggered when a user selects "Use Item" from their inventory.
   * 
   * @param interaction The original StringSelectMenuInteraction that triggered the use.
   * @param tenantId The active tenant ID (for multi-tenant isolation).
   * @param guildId The Discord Guild ID.
   * @param userId The Discord User ID of the person using the item.
   * @param instance The HydratedItem object representing the specific database instance being used.
   */
  async onUse(interaction: any, tenantId: string, guildId: string, userId: string, instance: any): Promise<void> {
    // Custom logic goes here
  }
}
```

## Critical Rules & Best Practices

1. **V2 Rendering Engine**: Always use `replyV2(interaction, ContainerService...)` to respond to the user. This ensures your response inherits the server's branding, color scheme, and global footers.
2. **Do Not Manually Defer**: The Action Engine does *not* auto-defer the interaction before calling `onUse`. This is intentional. It allows developers to respond with Modals (which cannot be sent if the interaction is already deferred).
   - *If your logic takes longer than 2.5 seconds (e.g., heavy API calls)*, manually call `await interaction.deferUpdate()` at the start of your method to prevent Discord from timing out the interaction.
3. **Dynamic Imports**: To prevent circular dependencies during bot initialization, dynamically import external services (like `TransportationService` or `TerritoryRepository`) inside the `onUse` block, rather than at the top of the file.

---

## Example 1: Consumable Items (Healing Potion)

This example demonstrates how to apply a stat change and consume the item (delete it from the database).

```typescript
  async onUse(interaction: any, tenantId: string, guildId: string, userId: string, instance: any): Promise<void> {
    const { prisma } = await import('../../../../../database/client');
    const { ContainerService, replyV2 } = await import('../../../../../utils/container');

    // 1. Apply the effect (e.g., heal user)
    // await UserService.heal(userId, 50);

    // 2. Consume the item by deleting the database instance
    await prisma.shop_inventory.delete({
      where: { id: instance.instanceId }
    });

    // 3. Inform the user
    return await replyV2(interaction, ContainerService.create({
      title: '🧪 Potion Consumed',
      description: 'You restored 50 HP. The potion vial shattered.',
      color: '#E74C3C',
      interaction,
      footer: true
    }));
  }
```

## Example 2: Interactive Deployables (Building Kits)

This example demonstrates how an item can render a brand new interactive UI, prompting the user for more information before executing the final action.

```typescript
  async onUse(interaction: any, tenantId: string, guildId: string, userId: string, instance: any): Promise<void> {
    const { ContainerService, replyV2 } = await import('../../../../../utils/container');
    const { TerritoryRepository } = await import('../../../../territory/database/TerritoryRepository');
    const { ActionRowBuilder, StringSelectMenuBuilder } = await import('discord.js');

    // 1. Fetch data required for the UI
    const nations = await TerritoryRepository.listByGuild(tenantId, guildId);
    
    if (!nations.length) {
      return await replyV2(interaction, ContainerService.simple('❌ No valid locations available.'));
    }

    // 2. Build a new interaction component
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(`build_outpost_${instance.instanceId}`)
      .setPlaceholder('🌍 Select deployment location...')
      .addOptions(nations.map((n: any) => ({
        label: n.name,
        value: n.id.toString(),
        emoji: '🏳️'
      })));

    // 3. Render the UI
    return await replyV2(interaction, ContainerService.create({
      title: '🏗️ Deploy Outpost',
      description: 'Where do you want to build? **This consumes the item.**',
      color: '#F39C12',
      components: [new ActionRowBuilder().addComponents(selectMenu)],
      interaction,
      footer: true
    }));
  }
```
*(Note: To handle the resulting `build_outpost_XXXX` interaction, you must add a listener in your module's `interactionCreate.ts` file).*

## Example 3: UI Shortcuts (Vehicles)

Sometimes, using an item doesn't consume it—it just acts as a convenient shortcut to open a related dashboard (like using a car key to open the travel console).

```typescript
  // Remember to flag the item so the target module can find it!
  metadata = {
    isVehicle: true, 
  };

  async onUse(interaction: any, tenantId: string, guildId: string, userId: string, instance: any): Promise<void> {
    const { TransportationService } = await import('../../../../transport/services/TransportationService');
    
    // Launch the Travel Console with this specific vehicle instance pre-selected
    return TransportationService.renderTravelConsole(
      interaction, 
      tenantId, 
      guildId, 
      userId, 
      undefined, // Nation not yet selected
      instance.instanceId // Pre-select this vehicle
    );
  }
```
