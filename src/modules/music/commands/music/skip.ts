import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { MusicService } from '../../services/MusicService';
import { ContainerService, replyV2 } from '../../../../utils/container';
import { tenantStorage } from '../../../../utils/context';

export default {
  data: (sub: SlashCommandSubcommandBuilder) =>
    sub.setName('skip')
       .setDescription('⏭️ Skip the currently playing track.'),

  async execute(interaction: ChatInputCommandInteraction) {
    const context = tenantStorage.getStore();
    if (!context) return;

    const { tenantId, guildId } = context;
    const userId = interaction.user.id;

    // --- LIVEDJ CHECK ---
    const { LiveDJService } = await import('../../services/LiveDJService');
    const activeDJ = await LiveDJService.getActiveDJ(guildId);
    if (activeDJ && activeDJ !== userId) {
      return await replyV2(interaction, ContainerService.create({
        title: '🎧 LiveDJ Session Active',
        description: `There is an active LiveDJ session hosted by <@${activeDJ}>. Only the DJ can skip tracks right now!`,
        color: '#E91E63',
        interaction
      }));
    }

    const { MusicRepository } = await import('../../database/MusicRepository');
    const settings = await MusicRepository.getSettings(tenantId, guildId);
    const member = interaction.member as any;
    const isDJ = settings.djRoleId ? member.roles.cache.has(settings.djRoleId) : true;

    if (isDJ) {
      await MusicService.skip(tenantId, guildId, userId);
      return await replyV2(interaction, ContainerService.create({
        title: '⏭️ Symphony | Instant Skip',
        description: `The DJ (<@${userId}>) has skipped the current track.`,
        color: '#F1C40F',
        footer: true,
        interaction
      }));
    }

    // Vote Skip Logic
    const { RedisService } = await import('../../../../services/RedisService');
    const voteKey = `music:voteskip:${guildId}`;
    const votes = await RedisService.sadd(voteKey, userId);
    const voteCount = await RedisService.scard(voteKey);
    const required = 3; // Example threshold

    if (voteCount >= required) {
      await MusicService.skip(tenantId, guildId, userId);
      await RedisService.del(voteKey);
      return await replyV2(interaction, ContainerService.create({
        title: '⏭️ Symphony | Vote Skip Succeeded',
        description: `The community has voted to skip the track! (${voteCount}/${required})`,
        color: '#27AE60',
        footer: true,
        interaction
      }));
    }

    const container = ContainerService.create({
      title: '🗳️ Symphony | Skip Vote',
      description: `<@${userId}> wants to skip. We need **${required - voteCount}** more votes!`,
      color: '#3498DB',
      fields: [
        { name: 'Progress', value: `\`${voteCount} / ${required}\`` }
      ],
      footer: true,
      interaction
    });

    await replyV2(interaction, container);
  }
};
