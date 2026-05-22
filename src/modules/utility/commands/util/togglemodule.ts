import { ChatInputCommandInteraction, SlashCommandSubcommandBuilder, PermissionFlagsBits } from 'discord.js';
import { ContainerService, replyV2 } from '../../../../utils/container';
import { tenantStorage } from '../../../../utils/context';
import { Translator } from '../../../../core/Translator';
import {
  getModuleConfig,
  toggleModule,
  getModuleLabel,
  getAllModules,
  ModuleKey
} from '../../../../utils/moduleToggle';

export default {
  data: (sub: SlashCommandSubcommandBuilder) =>
    sub
      .setName('togglemodule')
      .setDescription('💡 Admin: View and toggle server modules on/off')
      .addStringOption(opt => {
        const choices = getAllModules().slice(0, 25).map(mod => ({
          name: getModuleLabel(mod as ModuleKey),
          value: mod
        }));
        return opt
          .setName('module')
          .setDescription('Module to toggle (leave blank to view all)')
          .setRequired(false)
          .setChoices(...choices);
      })
      .addBooleanOption(opt =>
        opt
          .setName('enabled')
          .setDescription('Enable or disable the module')
          .setRequired(false)
      ),

  async execute(interaction: ChatInputCommandInteraction) {
    const context = tenantStorage.getStore();
    if (!context) return;
    const lang = context.lang || 'en';

    // Check admin permissions
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
      return await replyV2(interaction,
        ContainerService.create({
          title: '❌ Permission Denied',
          description: Translator.t('utility', 'admin.no_permission', lang),
          color: '#EA5455',
          footer: true,
          interaction
        })
      );
    }

    const moduleKey = interaction.options.getString('module');
    const enabledOption = interaction.options.getBoolean('enabled');

    try {
      // If no module specified, show all modules
      if (!moduleKey) {
        const config = await getModuleConfig(context.tenantId, context.guildId);

        const activeModules = Object.entries(config)
          .filter(([_, mod]) => mod.enabled)
          .map(([key, mod]) => {
            const reason = mod.reason ? ` (${mod.reason === 'MOTHER' ? '🛰️ Mothership' : mod.reason === 'OPERATOR' ? '⚙️ Operator' : 'Custom'})` : '';
            return `✅ ${mod.label}${reason}`;
          })
          .join('\n');

        const inactiveModules = Object.entries(config)
          .filter(([_, mod]) => !mod.enabled)
          .map(([key, mod]) => {
            const reason = mod.reason ? ` (${mod.reason === 'MOTHER' ? '🛰️ Mothership' : mod.reason === 'OPERATOR' ? '⚙️ Operator' : '👑 Admin'})` : '';
            return `❌ ${mod.label}${reason}`;
          })
          .join('\n');

        const response = ContainerService.create({
          title: '⚙️ Server Modules Status',
          description:
            'Below is the status of all available modules. Disabled modules marked with 👑 can be toggled by admins.',
          color: '#7367F0',
          interaction,
          footer: true,
          fields: [
            {
              name: '✅ Active Modules',
              value: activeModules || 'No active modules',
              inline: false
            },
            {
              name: '❌ Inactive Modules',
              value: inactiveModules || 'All modules are active!',
              inline: false
            }
          ]
        });

        return await replyV2(interaction, response);
      }

      // Toggle specific module
      if (enabledOption === null || enabledOption === undefined) {
        return await replyV2(interaction,
          ContainerService.create({
            title: '❌ Error',
            description: 'Please specify whether to enable or disable the module.',
            color: '#EA5455',
            footer: true,
            interaction
          })
        );
      }

      await toggleModule(context.tenantId, context.guildId, moduleKey as ModuleKey, enabledOption);

      const moduleLabel = getModuleLabel(moduleKey as ModuleKey);
      const stateStr = enabledOption ? (lang === 'fr' ? 'activé' : 'enabled') : (lang === 'fr' ? 'désactivé' : 'disabled');

      const response = ContainerService.create({
        title: `Module ${enabledOption ? 'Enabled' : 'Disabled'}`,
        description: `✅ **${moduleLabel}** has been **${stateStr}** by admin.`,
        color: enabledOption ? '#28C76F' : '#EA5455',
        interaction,
        footer: true
      });

      return await replyV2(interaction, response);
    } catch (error) {
      console.error('Error toggling module:', error);
      return await replyV2(interaction,
        ContainerService.create({
          title: '❌ Error',
          description: `Error toggling module: ${(error as Error).message}`,
          color: '#EA5455',
          footer: true,
          interaction
        })
      );
    }
  }
};
