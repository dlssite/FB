import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction, GuildMember } from 'discord.js';
import { TerritoryPowerService } from '../../services/TerritoryPowerService';
import { TerritoryRepository } from '../../database/TerritoryRepository';
import { ContainerService, replyV2 } from '../../../../utils/container';
import { tenantStorage } from '../../../../utils/context';

export default {
  data: (subcommand: SlashCommandSubcommandBuilder) =>
    subcommand
      .setName('banish')
      .setDescription('⛔ Permanently banish a user from a territory.')
      .addUserOption(opt => opt.setName('target').setDescription('The user to banish').setRequired(true))
      .addStringOption(opt => opt.setName('territory').setDescription('Name of the territory (if you govern multiple)'))
      .addStringOption(opt => opt.setName('reason').setDescription('Reason for the banishment')),

  async execute(interaction: ChatInputCommandInteraction) {
    const context = tenantStorage.getStore();
    if (!context) return;
    const { tenantId, guildId } = context;

    const targetUser = interaction.options.getUser('target', true);
    const territoryName = interaction.options.getString('territory');
    let reason = interaction.options.getString('reason') || 'No reason provided';

    const actor = interaction.member as GuildMember;
    const target = await interaction.guild?.members.fetch(targetUser.id);
    if (!target) return replyV2(interaction, ContainerService.simple('❌ Target user not found.'));

    // 1. Resolve which territory to act on
    const governed = await TerritoryPowerService.resolveGovernedTerritories(tenantId, guildId, actor);
    let territory = null;

    // A. Try to resolve by current channel category first (context-aware)
    const channel = interaction.channel as any;
    if (channel?.parentId) {
      const channelTerritory = governed.find(t => t.categoryId === channel.parentId);
      if (channelTerritory) territory = channelTerritory;
    }

    // B. If a name was provided, try to find that specific one
    if (territoryName && !territory) {
      const matched = governed.find(t => t.name.toLowerCase() === territoryName.toLowerCase());
      if (matched) {
        territory = matched;
      } else if (governed.length === 1) {
        // Smart Fallback for single-nation patrons (prefix use)
        territory = governed[0];
        reason = reason === 'No reason provided' ? territoryName : `${territoryName} ${reason}`;
      }
    } 
    
    // C. Final fallback for single-nation patrons if no name/channel match
    if (!territory && governed.length === 1) {
      territory = governed[0];
    }

    if (!territory) {
      if (governed.length > 1) {
        return replyV2(interaction, ContainerService.simple(`⚠️ You govern multiple territories. Please specify one: ${governed.map(t => `\`${t.name}\``).join(', ')}`));
      }
      return replyV2(interaction, ContainerService.simple('❌ You do not have Patron authority over any such territory.'));
    }

    // 2. Hierarchy Check
    const check = await TerritoryPowerService.canGovernTarget(actor, target, territory);
    if (!check.allowed) return replyV2(interaction, ContainerService.simple(`❌ ${check.reason}`));

    // 3. Execution
    try {
      await TerritoryPowerService.executeBanish(target, territory, reason);
      await TerritoryPowerService.logAndNotify(tenantId, actor, target, territory, 'BANISH', reason, interaction);
      
      const response = ContainerService.create({
        title: '⛔ Banishment Successful',
        description: `**${target.user.tag}** has been banished from **${territory.name}**.\n**Reason:** ${reason}`,
        color: '#EA5455',
        footer: true,
        interaction
      });
      await interaction.editReply(response);
    } catch (err: any) {
      await replyV2(interaction, ContainerService.simple(`❌ Error executing banishment: ${err.message}`));
    }
  }
};
