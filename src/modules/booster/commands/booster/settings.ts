import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction, PermissionsBitField } from 'discord.js';
import { BoosterRepository } from '../../database/BoosterRepository';
import { ContainerService, replyV2 } from '../../../../utils/container';
import { tenantStorage } from '../../../../utils/context';

export default {
  data: (sub: SlashCommandSubcommandBuilder) =>
    sub.setName('settings')
       .setDescription('⚙️ [ADMIN] Configure booster module settings.')
       .addChannelOption(opt => opt.setName('channel').setDescription('The channel to post Thank You cards in.').setRequired(false))
       .addRoleOption(opt => opt.setName('anchor_role').setDescription('Custom booster roles will be created right BELOW this role.').setRequired(false)),
       
  async execute(interaction: ChatInputCommandInteraction) {
    const context = tenantStorage.getStore();
    if (!context || !interaction.guild) return;

    if (!interaction.memberPermissions?.has(PermissionsBitField.Flags.Administrator)) {
      return replyV2(interaction, ContainerService.simple('❌ You need Administrator permissions to configure this.', { color: 'Red' }) as any);
    }

    const channel = interaction.options.getChannel('channel');
    const role = interaction.options.getRole('anchor_role');

    const updateData: any = {};
    if (channel) updateData.boosterChannelId = channel.id;
    if (role) updateData.roleAnchorId = role.id;

    if (Object.keys(updateData).length === 0) {
      return replyV2(interaction, ContainerService.simple('❌ You must provide at least one setting to update.', { color: 'Red' }) as any);
    }

    await BoosterRepository.updateSettings(context.tenantId, interaction.guild.id, updateData);

    await replyV2(interaction, ContainerService.simple('✅ Booster module settings updated successfully.', { color: '#28C76F' }) as any);
  }
};
