import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction, GuildMember, CategoryChannel } from 'discord.js';
import { TerritoryPowerService } from '../../services/TerritoryPowerService';
import { ContainerService } from '../../../../utils/container';
import { tenantStorage } from '../../../../utils/context';

export default {
  data: (subcommand: SlashCommandSubcommandBuilder) =>
    subcommand
      .setName('silence')
      .setDescription('🔇 Mute a user within a territory category.')
      .addUserOption(opt => opt.setName('target').setDescription('The user to silence').setRequired(true))
      .addStringOption(opt => opt.setName('territory').setDescription('Name of the territory'))
      .addStringOption(opt => opt.setName('reason').setDescription('Reason for silencing')),

  async execute(interaction: ChatInputCommandInteraction) {
    const context = tenantStorage.getStore();
    if (!context) return;
    const { tenantId, guildId } = context;

    const targetUser = interaction.options.getUser('target', true);
    const territoryName = interaction.options.getString('territory');
    let reason = interaction.options.getString('reason') || 'No reason provided';

    const actor = interaction.member as GuildMember;
    const target = await interaction.guild?.members.fetch(targetUser.id);
    if (!target) return interaction.editReply(ContainerService.simple('❌ Target user not found.').reply);

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

    if (!territory) return interaction.editReply(ContainerService.simple('❌ Territory not found or multiple options exist.').reply);

    const check = await TerritoryPowerService.canGovernTarget(actor, target, territory);
    if (!check.allowed) return interaction.editReply(ContainerService.simple(`❌ ${check.reason}`).reply);

    try {
      await TerritoryPowerService.executeSilence(target, territory, reason);
      await TerritoryPowerService.logAndNotify(tenantId, actor, target, territory, 'SILENCE', reason, interaction);
      
      const response = ContainerService.create({
        title: '🔇 Silence Applied',
        description: `**${target.user.tag}** has been silenced in **${territory.name}**.\n**Reason:** ${reason}`,
        color: '#7367F0',
        footer: true,
        interaction
      });
      await interaction.editReply(response.reply);
    } catch (err: any) {
      await interaction.editReply(ContainerService.simple(`❌ Error: ${err.message}`).reply);
    }
  }
};
