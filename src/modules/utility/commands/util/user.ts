import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { ContainerService, replyV2 } from '../../../../utils/container';
import { flamebornConfig } from '../../../../config/flameborn.config';

export default {
  data: (sub: SlashCommandSubcommandBuilder) =>
    sub.setName('user')
      .setDescription('Displays detailed information about a member')
      .addUserOption(opt => opt.setName('target').setDescription('The user to get info about')),
      
  async execute(interaction: ChatInputCommandInteraction) {
    const user = interaction.options.getUser('target') || interaction.user;
    const member = await interaction.guild?.members.fetch(user.id).catch(() => null);

    const fields = [
      { name: '👤 User Information', value: `**ID:** \`${user.id}\`\n**Created:** <t:${Math.floor(user.createdTimestamp / 1000)}:R>` }
    ];

    if (member) {
      const roles = member.roles.cache
        .filter(r => r.id !== interaction.guildId)
        .sort((a, b) => b.position - a.position)
        .map(r => r.toString())
        .join(', ') || 'None';

      fields.push(
        { name: '🛡️ Member Information', value: `**Joined:** <t:${Math.floor(member.joinedTimestamp! / 1000)}:R>\n**Nickname:** ${member.nickname || 'None'}` },
        { name: `🎭 Roles [${member.roles.cache.size - 1}]`, value: roles.length > 1024 ? `${roles.substring(0, 1020)}...` : roles }
      );
    }

    await replyV2(interaction, ContainerService.create({
      title: user.tag,
      thumbnail: user.displayAvatarURL({ size: 256 }),
      media: [flamebornConfig.assets.statsBanner],
      color: member?.displayHexColor || flamebornConfig.branding.color,
      fields,
      footer: true,
      interaction
    }));
  },
};
