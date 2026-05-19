import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction, ChannelType } from 'discord.js';
import { ContainerService } from '../../../../utils/container';
import { flamebornConfig } from '../../../../config/flameborn.config';

export default {
  data: (sub: SlashCommandSubcommandBuilder) =>
    sub.setName('server')
      .setDescription('Displays information about the current server'),
      
  async execute(interaction: ChatInputCommandInteraction) {
    const { guild } = interaction;
    if (!guild) return;

    const owner = await guild.fetchOwner();
    const channels = guild.channels.cache;

    const fields = [
      { name: '👑 Owner', value: `${owner.user.tag}\n(\`${owner.id}\`)` },
      { name: '📅 Created', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>` },
      { name: '🚀 Boost Level', value: `Level ${guild.premiumTier} (${guild.premiumSubscriptionCount} boosts)` },
      { name: '👥 Members', value: `**Total:** ${guild.memberCount}` },
      { name: '📂 Channels', value: `**Text:** ${channels.filter(c => c.type === ChannelType.GuildText).size}\n**Voice:** ${channels.filter(c => c.type === ChannelType.GuildVoice).size}\n**Category:** ${channels.filter(c => c.type === ChannelType.GuildCategory).size}` },
      { name: '🛡️ Roles', value: `**Total:** ${guild.roles.cache.size}` }
    ];

    if (guild.features.length > 0) {
      fields.push({ name: '✨ Server Features', value: `\`${guild.features.join('`, `')}\`` });
    }

    await interaction.editReply(ContainerService.create({
      title: `${guild.name} [${guild.id}]`,
      thumbnail: guild.iconURL({ size: 256 }) || undefined,
      media: guild.banner ? [guild.bannerURL({ size: 1024 })!] : [flamebornConfig.assets.statsBanner],
      color: flamebornConfig.branding.color,
      fields,
      footer: true,
      interaction
    }));
  },
};
