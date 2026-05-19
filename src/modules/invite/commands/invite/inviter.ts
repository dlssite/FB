import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { InviteRepository } from '../../database/InviteRepository';
import { ContainerService, replyV2 } from '../../../../utils/container';
import { tenantStorage } from '../../../../utils/context';

export default {
  data: (sub: SlashCommandSubcommandBuilder) =>
    sub.setName('inviter')
       .setDescription('🔍 Find out who invited you or another member.')
       .addUserOption(opt => opt.setName('user').setDescription('The user to check.').setRequired(false)),
       
  async execute(interaction: ChatInputCommandInteraction) {
    const context = tenantStorage.getStore();
    if (!context || !interaction.guild) return;

    const targetUser = interaction.options.getUser('user') || interaction.user;

    const history = await InviteRepository.getMemberHistory(context.tenantId, interaction.guild.id, targetUser.id);

    if (!history) {
      return replyV2(
        interaction,
        ContainerService.simple(`❌ No join history found for **${targetUser.username}**.`, { color: 'Red' })
      );
    }

    let inviterDisplay = 'Unknown/Vanity';
    if (history.inviterId === 'VANITY') {
      inviterDisplay = `Server Vanity URL (\`${history.inviteCode}\`)`;
    } else if (history.inviterId !== 'UNKNOWN') {
      inviterDisplay = `<@${history.inviterId}> (\`${history.inviterId}\`)`;
    }

    const container = ContainerService.create({
      title: `Join Audit: ${targetUser.username}`,
      description: `**Invited By:** ${inviterDisplay}\n**Invite Code:** \`${history.inviteCode || 'N/A'}\`\n**Join Date:** <t:${Math.floor(history.createdAt.getTime() / 1000)}:f>`,
      color: '#A061FF',
      thumbnail: targetUser.displayAvatarURL(),
      footer: true,
      fields: [
        { name: '📥 Join Type', value: `\`${history.joinType.toUpperCase()}\``, inline: true },
        { name: '🚩 Status', value: history.isFake ? '⚠️ Flagged' : '✅ Verified', inline: true }
      ],
      interaction
    });

    await replyV2(interaction, container);
  }
};
