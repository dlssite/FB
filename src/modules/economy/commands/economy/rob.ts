import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from 'discord.js';
import { CrimeService } from '../../services/CrimeService';
import { EconomyRepository } from '../../database/EconomyRepository';
import { ContainerService, replyV2 } from '../../../../utils/container';
import { tenantStorage } from '../../../../utils/context';
import { flamebornConfig } from '../../../../config/flameborn.config';

export default {
  data: (sub: SlashCommandSubcommandBuilder) =>
    sub.setName('rob')
       .setDescription('🕵️ Attempt to rob another user.')
       .addUserOption(opt => opt.setName('target').setDescription('The user to rob').setRequired(true)),

  async execute(interaction: ChatInputCommandInteraction) {
    const context = tenantStorage.getStore();
    if (!context) return;
    const lang = context.lang || 'en';

    const target = interaction.options.getUser('target', true);
    
    // Easter Egg: Robbing the Bot
    if (target.id === interaction.client.user.id) {
      const botResult = await CrimeService.robBot(context.tenantId, interaction.user.id);
      const botEmbed = ContainerService.create({
        title: '👽 Sentient Awareness Detected',
        description: botResult.scenario,
        image: botResult.success ? flamebornConfig.economy.assets.successBanner : flamebornConfig.economy.assets.failureBanner,
        color: botResult.success ? '#28C76F' : '#EA5455',
        interaction
      });
      await EconomyRepository.updateCooldown(context.tenantId, interaction.user.id, 'lastRob');
      return await replyV2(interaction, botEmbed);
    }

    if (target.id === interaction.user.id) {
      return await replyV2(interaction, ContainerService.simple('❌ You cannot rob yourself.'));
    }

    // Check Cooldown
    const user = await EconomyRepository.getUser(context.tenantId, interaction.user.id);
    if (user?.lastRob) {
      const minutesSince = (Date.now() - new Date(user.lastRob).getTime()) / 60000;
      if (minutesSince < 30) {
        const cooldownEmbed = ContainerService.create({
          title: '⌛ Heat Level High',
          description: `Your heat level is too high. Wait **${Math.ceil(30 - minutesSince)}** more minutes for the heat to die down.`,
          image: flamebornConfig.economy.assets.cooldownBanner,
          color: '#F9AC19',
          interaction
        });
        return await replyV2(interaction, cooldownEmbed);
      }
    }

    const result = await CrimeService.rob(context.tenantId, interaction.user.id, target.id);

    // Initial Embed
    const embed = ContainerService.create({
      title: Translator.t('economy', 'rob.title', lang),
      description: result.scenario,
      image: result.success ? flamebornConfig.economy.assets.successBanner : flamebornConfig.economy.assets.failureBanner,
      color: result.success ? '#28C76F' : '#EA5455',
      interaction
    });

    if (result.success && result.isOpportunity) {
      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId('rob_opportunity_accept').setLabel(lang === 'fr' ? 'Prendre le risque' : 'Take the Risk (High Reward)').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('rob_opportunity_decline').setLabel(lang === 'fr' ? 'Décliner' : 'Decline (Standard Reward)').setStyle(ButtonStyle.Secondary)
      );

      const finalEmbed = ContainerService.create({
        ...embed as any,
        title: Translator.t('economy', 'rob.title', lang),
        description: `${Translator.t('economy', 'crime.opportunity_desc', lang)}\n\n${result.scenario}`,
        components: [row]
      });

      await replyV2(interaction, finalEmbed);
      const opportunityMsg = await interaction.fetchReply();

      const collector = opportunityMsg.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 30000
      });

      collector.on('collect', async (i) => {
        if (i.user.id !== interaction.user.id) return;

        await i.deferUpdate().catch(() => {});

        if (i.customId === 'rob_opportunity_accept') {
          const success = Math.random() < 0.3;
          if (success) {
            const bonusAmount = result.amount * 3;
            await EconomyRepository.updateBalance(context.tenantId, interaction.user.id, { embers: bonusAmount });
            await EconomyRepository.updateBalance(context.tenantId, target.id, { embers: -bonusAmount });
            await replyV2(interaction, ContainerService.simple(Translator.t('economy', 'crime.jackpot', lang, { amount: bonusAmount.toLocaleString() })));
          } else {
            const failPenalty = Math.floor(result.amount * 1.5);
            await EconomyRepository.updateBalance(context.tenantId, interaction.user.id, { embers: -failPenalty });
            await replyV2(interaction, ContainerService.simple(Translator.t('economy', 'crime.alarm', lang, { penalty: failPenalty.toLocaleString() })));
          }
        } else {
          await EconomyRepository.updateBalance(context.tenantId, interaction.user.id, { embers: result.amount });
          await EconomyRepository.updateBalance(context.tenantId, target.id, { embers: -result.amount });
          await replyV2(interaction, ContainerService.simple(Translator.t('economy', 'crime.safe_exit', lang, { amount: result.amount.toLocaleString() })));
        }
        await EconomyRepository.updateCooldown(context.tenantId, interaction.user.id, 'lastRob');
      });
      return;
    }

    if (result.success) {
      await EconomyRepository.updateBalance(context.tenantId, interaction.user.id, { embers: result.amount });
      await EconomyRepository.updateBalance(context.tenantId, target.id, { embers: -result.amount });
      (embed as any).embeds[0].description += `\n\n💰 **Stolen:** \`${result.amount.toLocaleString()} 💠\``;
    }

    await EconomyRepository.updateCooldown(context.tenantId, interaction.user.id, 'lastRob');
    await replyV2(interaction, embed);
  }
};
