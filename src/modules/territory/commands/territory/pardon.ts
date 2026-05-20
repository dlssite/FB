import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction, GuildMember } from 'discord.js';
import { TerritoryPowerService } from '../../services/TerritoryPowerService';
import { ContainerService } from '../../../../utils/container';
import { tenantStorage } from '../../../../utils/context';

export default {
  data: (subcommand: SlashCommandSubcommandBuilder) =>
    subcommand
      .setName('pardon')
      .setDescription('✅ Lift a travel ban from a user.')
      .addUserOption(opt => opt.setName('target').setDescription('The user to pardon').setRequired(true))
      .addStringOption(opt => opt.setName('territory').setDescription('Name of the territory'))
      .addStringOption(opt => opt.setName('reason').setDescription('Reason for the pardon')),

  async execute(interaction: ChatInputCommandInteraction) {
    const context = tenantStorage.getStore();
    if (!context) return;
    const { tenantId, guildId } = context;

    const targetUser = interaction.options.getUser('target', true);
    const territoryName = interaction.options.getString('territory');
    let reason = interaction.options.getString('reason') || 'No reason provided';

    const actor = interaction.member as GuildMember;
    const target = await interaction.guild?.members.fetch(targetUser.id);
    if (!target) return interaction.editReply(ContainerService.simple('❌ Target user not found.'));

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

    if (!territory) return interaction.editReply(ContainerService.simple('❌ Territory not found or multiple options exist.'));

    if (territory.banRoleId && target.roles.cache.has(territory.banRoleId)) {
      try {
        await target.roles.remove(territory.banRoleId, `Territory Pardon: ${reason}`);
        await TerritoryPowerService.logAndNotify(tenantId, actor, target, territory, 'PARDON', reason, interaction);
        
        const response = ContainerService.create({
          title: '✅ Pardon Successful',
          description: `**${target.user.tag}** has been pardoned in **${territory.name}**.`,
          color: '#28C76F',
          footer: true,
          interaction
        });
        await interaction.editReply(response);
      } catch (err: any) {
        await interaction.editReply(ContainerService.simple(`❌ Error: ${err.message}`));
      }
    } else {
      await interaction.editReply(ContainerService.simple(`⚠️ **${target.user.tag}** does not have a travel ban in this territory.`));
    }
  }
};
