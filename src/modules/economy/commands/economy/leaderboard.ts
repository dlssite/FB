import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { EconomyRepository } from '../../database/EconomyRepository';
import { VaultService } from '../../services/VaultService';
import { ContainerService, replyV2 } from '../../../../utils/container';
import { tenantStorage } from '../../../../utils/context';
import { flamebornConfig } from '../../../../config/flameborn.config';
import { Translator } from '../../../../core/Translator';

export default {
  data: (sub: SlashCommandSubcommandBuilder) =>
    sub.setName('leaderboard')
       .setDescription('🏆 Rank the wealthiest citizens in the Flameborn ecosystem.'),

  async execute(interaction: ChatInputCommandInteraction) {
    const context = tenantStorage.getStore();
    if (!context) return;
    const lang = context.lang || 'en';

    const topUsers = await EconomyRepository.getTopUsers(context.tenantId, 10);

    if (topUsers.length === 0) {
      return await replyV2(interaction, ContainerService.simple(Translator.t('economy', 'leaderboard.empty', lang)));
    }

    const leaderboardLines = await Promise.all(topUsers.map(async (u, index) => {
      const userObj = await interaction.client.users.fetch(u.userId).catch(() => null);
      const username = userObj ? userObj.username : `Citizen_${u.userId.slice(0, 5)}`;
      const rank = index + 1;
      const medal = rank === 1 ? '🥇' : (rank === 2 ? '🥈' : (rank === 3 ? '🥉' : `**#${rank}**`));
      
      const vault = VaultService.getVault(u.bankType || 'prism_ledger');
      const isVaultHidden = vault.hidden === true;
      
      const pocketBal = `\`${Number(u.embers || 0).toLocaleString()} 💠\``;
      const vaultBal = isVaultHidden 
        ? Translator.t('economy', 'leaderboard.redacted', lang) 
        : `\`${Number(u.emberVault || 0).toLocaleString()} 💠\``;
      
      return `${medal} **${username}**\n💰 ${Translator.t('economy', 'leaderboard.pocket', lang)}: ${pocketBal} | 🏦 ${Translator.t('economy', 'leaderboard.vault', lang)}: ${vaultBal}\n───────────────────`;
    }));

    const topUserObj = await interaction.client.users.fetch(topUsers[0].userId).catch(() => null);

    const embed = ContainerService.create({
      title: Translator.t('economy', 'leaderboard.title', lang),
      description: Translator.t('economy', 'leaderboard.desc', lang, { lines: leaderboardLines.join('\n') }),
      thumbnail: topUserObj?.displayAvatarURL() || undefined,
      image: flamebornConfig.economy.assets.bankBanner,
      color: '#F9AC19',
      footer: true,
      interaction
    });

    return await replyV2(interaction, embed);
  }
};
