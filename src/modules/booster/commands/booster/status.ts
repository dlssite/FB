import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction, GuildMember } from 'discord.js';
import { BoosterService } from '../../services/BoosterService';
import { ContainerService, replyV2 } from '../../../../utils/container';
import { tenantStorage } from '../../../../utils/context';

export default {
  data: (sub: SlashCommandSubcommandBuilder) =>
    sub.setName('status')
       .setDescription('🚀 View your current booster perks and tier.'),
       
  async execute(interaction: ChatInputCommandInteraction) {
    const context = tenantStorage.getStore();
    if (!context || !interaction.guild) return;

    const member = interaction.member as GuildMember;
    const status = await BoosterService.getTierStatus(context.tenantId, interaction.guild.id, interaction.user.id, member);

    let title = 'Booster Ecosystem Status';
    let desc = 'You are not currently boosting the server. Boost today to unlock exclusive perks!';
    let fields = [];

    if (status.isBuddy) {
      title = '🤝 Booster Buddy Status';
      desc = `You are linked as a Booster Buddy to <@${status.ownerId}>!\n\nYou inherit the following perks:\n- 1.5x Economy Boost\n- 1.2x Leveling Boost`;
    } else if (status.tier === 1) {
      title = '🚀 Tier 1 Supporter';
      desc = 'Thank you for your boost! You have unlocked:\n- 1.5x Economy Boost\n- 1.2x Leveling Boost\n\n*Boost again to reach Tier 2 and forge a Custom Identity!*';
    } else if (status.tier >= 2) {
      title = '✨ Tier 2 Architect';
      desc = 'Thank you for your immense support! You have unlocked:\n- 1.5x Economy Boost\n- 1.2x Leveling Boost\n- Custom Identity Forge (`/booster role`)\n- Buddy Sharing (`/booster share`)';
    }

    const container = ContainerService.create({
      title,
      description: desc,
      color: status.tier >= 2 ? '#FFD700' : (status.tier === 1 || status.isBuddy ? '#FF73FA' : '#82868B'),
      footer: true,
      interaction
    });

    await replyV2(interaction, container);
  }
};
