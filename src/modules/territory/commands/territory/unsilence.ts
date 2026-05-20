import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction, GuildMember } from 'discord.js';
import { TerritoryPowerService } from '../../services/TerritoryPowerService';
import { ContainerService } from '../../../../utils/container';
import { tenantStorage } from '../../../../utils/context';

export default {
  data: (subcommand: SlashCommandSubcommandBuilder) =>
    subcommand
      .setName('unsilence')
      .setDescription('🔊 Lift a silence from a user in a territory category.')
      .addUserOption(opt => opt.setName('target').setDescription('The user to unsilence').setRequired(true))
      .addStringOption(opt => opt.setName('territory').setDescription('Name of the territory')),

  async execute(interaction: ChatInputCommandInteraction) {
    const context = tenantStorage.getStore();
    if (!context) return;
    const { tenantId, guildId } = context;

    const targetUser = interaction.options.getUser('target', true);
    const territoryName = interaction.options.getString('territory');

    const actor = interaction.member as GuildMember;
    const target = await interaction.guild?.members.fetch(targetUser.id);
    if (!target) return interaction.editReply(ContainerService.simple('❌ Target user not found.'));

    const governed = await TerritoryPowerService.resolveGovernedTerritories(tenantId, guildId, actor);
    let territory = territoryName ? governed.find(t => t.name.toLowerCase() === territoryName.toLowerCase()) : (governed.length === 1 ? governed[0] : null);

    if (!territory) return interaction.editReply(ContainerService.simple('❌ Territory not found or multiple options exist.'));

    try {
      await TerritoryPowerService.executeUnsilence(target, territory);
      await TerritoryPowerService.logAndNotify(tenantId, actor, target, territory, 'UNSILENCE', 'Silence lifted', interaction);
      
      const response = ContainerService.create({
        title: '🔊 Silence Lifted',
        description: `**${target.user.tag}** has been unsilenced in **${territory.name}**.`,
        color: '#28C76F',
        footer: true,
        interaction
      });
      await interaction.editReply(response);
    } catch (err: any) {
      await interaction.editReply(ContainerService.simple(`❌ Error: ${err.message}`));
    }
  }
};
