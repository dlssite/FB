import { Events, Interaction, MessageFlags, PermissionFlagsBits } from 'discord.js';
import { tenantStorage } from '../../../utils/context';
import { FlamebornClient } from '../../../core/FlamebornClient';

import { TenantRepository } from '../../../repositories/TenantRepository';
import { GuildService } from '../../../services/GuildService';
import { ActivityLogService } from '../../activity/services/ActivityLogService';
import { EmbedService } from '../../../utils/embed';
import { AddonService } from '../../../services/AddonService';
import { RedisService } from '../../../services/RedisService';
import { RoutingService } from '../../../services/RoutingService';
import { Logger } from '../../../utils/logger';

// Logic moved to RoutingService for module-level precision

export default {
  name: Events.InteractionCreate,
  once: false,
  async execute(interaction: Interaction, client: FlamebornClient) {
    // 1. Resolve Command if applicable
    let command = null;
    if (interaction.isChatInputCommand() || interaction.isAutocomplete()) {
      command = client.commands.get(interaction.commandName);
    }

    // 2. Defer ChatInputCommands
    // We use IsComponentsV2 by default for all slash commands.
    // Ephemeral status is determined by the command's 'ephemeral' property.
    if (interaction.isChatInputCommand()) {
      const isEphemeral = (command as any)?.ephemeral === true || interaction.options.getBoolean('private') === true || interaction.options.getBoolean('ephemeral') === true;
      try {
        await interaction.deferReply({ 
          flags: isEphemeral 
            ? (MessageFlags.IsComponentsV2 as any || 32768) | (MessageFlags.Ephemeral as any || 64) 
            : (MessageFlags.IsComponentsV2 as any || 32768)
        });
      } catch (err) {
        Logger.error('Critical: Could not defer interaction', err);
        return;
      }
    }
    
    // 3. Resolve Module Name
    const moduleName = command ? (command as any).module : 'core';

    const guildId = interaction.guildId as string;
    const tenantId = await RoutingService.resolveTenantId(guildId, moduleName);

    // Attach routing metadata directly to the interaction for module-level listeners
    (interaction as any).tenantId = tenantId;
    (interaction as any).guildId = guildId;

    // 4. Gatekeeper Check (For Commands)
    if (command) {
      const subcommand = (interaction as any).options.getSubcommand(false);
      const isSystemAction = (command.module === 'leveling' && (subcommand === 'toggle' || subcommand === 'settings'));

      if (!isSystemAction) {
        const status = await AddonService.checkStatus(tenantId, guildId, command.module);
        if (!status.enabled) {
          const message = status.reason === 'MOTHER'
            ? `❌ The **${command.module.toUpperCase()}** module is currently disabled by Mother.`
            : `❌ The **${command.module.toUpperCase()}** module is currently disabled by a server administrator.`;
          
          // Only reply if this is a ChatInputCommand (not Autocomplete)
          if (interaction.isChatInputCommand()) {
            if (interaction.deferred) await interaction.editReply({ content: message });
            else await interaction.reply({ content: message, flags: [MessageFlags.Ephemeral] });
          }
          return;
        }
      }
    }
    try {
      const settings = guildId ? await GuildService.getSettings(tenantId, guildId) : null;
      const lang = settings?.lang || 'en';
      (interaction as any).lang = lang;

      const botAllowedRoleIds = settings?.botAllowedRoleIds
        ? Array.isArray(settings.botAllowedRoleIds)
          ? settings.botAllowedRoleIds
          : JSON.parse(settings.botAllowedRoleIds as any)
        : [];

      const botName = interaction.client?.user?.username || settings?.botName || 'this bot';
      const isAdmin = (interaction.member as any)?.permissions?.has([
        PermissionFlagsBits.Administrator,
        PermissionFlagsBits.ManageGuild
      ]);
      if (command && botAllowedRoleIds.length > 0 && !isAdmin) {
        const roleCache = (interaction.member as any)?.roles?.cache;
        const hasAllowedRole = roleCache && botAllowedRoleIds.some((roleId: string) => roleCache.has(roleId));

        if (!hasAllowedRole) {
          const botName = interaction.client?.user?.username || 'Flameborn';
          const requiredRoles = botAllowedRoleIds
            .map((roleId: string) => {
              const role = interaction.guild?.roles.cache.get(roleId);
              return role ? `\`${role.name}\`` : `\`${roleId}\``;
            })
            .join(', ');
          const message = `❌ You dont have access to ${botName}. You need ${requiredRoles} to use this flameborn.`;
          if (interaction.isChatInputCommand()) {
            if (interaction.deferred) await interaction.editReply({ content: message });
            else await interaction.reply({ content: message, flags: [MessageFlags.Ephemeral] });
          }
          return;
        }
      }

      // 5. Global Command Ratelimiter (3 commands / 5s)
      if (command && !isAdmin) {
        const cooldownKey = `ratelimit:${interaction.user.id}`;
        const current = await RedisService.client.incr(cooldownKey);
        if (current === 1) await RedisService.client.expire(cooldownKey, 5);
        
        if (current > 3) {
          const ratelimitContainer = EmbedService.containerError(
            '⚠️ **Ratelimit Triggered!**\nYour neural link is overheating. Please slow down to prevent synchronization failure.',
            'RATELIMIT_VOID'
          );
          
          const isEphemeral = (command as any)?.ephemeral === true;
          if (interaction.isChatInputCommand()) {
            if (interaction.deferred) await interaction.editReply({ components: ratelimitContainer.components });
            else await interaction.reply({ 
              components: ratelimitContainer.components, 
              flags: isEphemeral ? MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral : MessageFlags.IsComponentsV2 
            });
          }
          return;
        }
      }

      // Wrap EVERYTHING in the context so module-level interaction listeners can access it
      await tenantStorage.run({ tenantId, guildId, lang }, async () => {
        if (command) {
          if (interaction.isChatInputCommand()) {
            await ActivityLogService.sendBotCommandLog(interaction.guild!, tenantId, {
              commandName: interaction.commandName,
              userTag: interaction.user.tag,
              userId: interaction.user.id,
              channelId: interaction.channelId || undefined,
              channelName: (interaction.channel?.isTextBased() && 'name' in interaction.channel ? interaction.channel.name : undefined) || undefined,
              source: 'slash'
            });

            await command.execute(interaction);
          } else if (interaction.isAutocomplete() && command.autocomplete) {
            await command.autocomplete(interaction);
          }
        } else {
          // For non-command interactions (buttons/modals), the logic is handled by 
          // dedicated event listeners in the modules. We just need to make sure 
          // we don't accidentally stop execution here, though we don't need to 
          // manually trigger them as Discord.js emits the event to all listeners.
          // However, we MUST wait for the context block to persist if we want it 
          // to be available during the tick. Since AsyncLocalStorage is per-tick/async-chain,
          // this works for everything called within this run() callback.
        }
      });
    } catch (error: any) {
      Logger.error(`Command Execution Error [${interaction.user.id}]`, error);
      
      // Autocomplete interactions cannot be replied to with embeds/messages
      if (interaction.isAutocomplete()) return;

      // Generate a simple error ID for the user to report
      const errorId = `ERR-${Date.now().toString(36).toUpperCase()}`;
      const errorContainer = EmbedService.containerError(
        'An unexpected error occurred while executing this command. Please try again later or contact support.',
        errorId
      );
      
      if (interaction.replied || interaction.deferred) {
        await interaction.editReply({ components: errorContainer.components }).catch(() => {});
      } else {
        const isEphemeral = (command as any)?.ephemeral === true;
        await interaction.reply({ 
          components: errorContainer.components, 
          flags: isEphemeral ? MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral : MessageFlags.IsComponentsV2 
        }).catch(() => {});
      }
    }
  },
};
