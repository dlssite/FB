import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction, GuildMember } from 'discord.js';
import { TerritoryPowerService } from '../../services/TerritoryPowerService';
import { ContainerService, replyV2 } from '../../../../utils/container';
import { tenantStorage } from '../../../../utils/context';

export default {
  data: (subcommand: SlashCommandSubcommandBuilder) =>
    subcommand
      .setName('exile')
      .setDescription('🚪 Soft-remove a user from a territory.')
      .addUserOption(opt => opt.setName('target').setDescription('The user to exile').setRequired(true))
      .addStringOption(opt => opt.setName('territory').setDescription('Name of the territory'))
      .addStringOption(opt => opt.setName('reason').setDescription('Reason for the exile')),

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

    const governed = await TerritoryPowerService.resolveGovernedTerritories(tenantId, guildId, actor);
    let territory = null;

    const channel = interaction.channel as any;
    if (channel?.parentId) {
      const channelTerritory = governed.find(t => t.categoryId === channel.parentId);
      if (channelTerritory) territory = channelTerritory;
    }

    if (territoryName && !territory) {
      const matched = governed.find(t => t.name.toLowerCase() === territoryName.toLowerCase());
      if (matched) {
        territory = matched;
      } else if (governed.length === 1) {
        territory = governed[0];
        reason = reason === 'No reason provided' ? territoryName : `${territoryName} ${reason}`;
      }
    } else if (governed.length === 1 && !territory) {
      territory = governed[0];
    }

    if (!territory) return replyV2(interaction, ContainerService.simple('❌ Territory not found or multiple options exist.'));

    const check = await TerritoryPowerService.canGovernTarget(actor, target, territory);
    if (!check.allowed) return replyV2(interaction, ContainerService.simple(`❌ ${check.reason}`));

    try {
      await TerritoryPowerService.executeExile(target, territory, reason);
      await TerritoryPowerService.logAndNotify(tenantId, actor, target, territory, 'EXILE', reason, interaction);
      
      const response = ContainerService.create({
        title: '🚪 Exile Successful',
        description: `**${target.user.tag}** has been exiled from **${territory.name}**.\n**Reason:** ${reason}`,
        color: '#7367F0',
        footer: true,
        interaction
      });
      await interaction.editReply(response);
    } catch (err: any) {
      await replyV2(interaction, ContainerService.simple(`❌ Error: ${err.message}`));
    }
  }
};
