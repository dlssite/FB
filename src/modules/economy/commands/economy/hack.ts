import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from 'discord.js';
import { CrimeService } from '../../services/CrimeService';
import { EconomyRepository } from '../../database/EconomyRepository';
import { ContainerService, replyV2 } from '../../../../utils/container';
import { tenantStorage } from '../../../../utils/context';
import { flamebornConfig } from '../../../../config/flameborn.config';
import { Translator } from '../../../../core/Translator';

export default {
  data: (sub: SlashCommandSubcommandBuilder) =>
    sub.setName('hack')
       .setDescription('💻 Neural breach: Attempt to hack another user.')
       .addUserOption(opt => opt.setName('target').setDescription('The user to hack').setRequired(true)),

  async execute(interaction: ChatInputCommandInteraction) {
    const context = tenantStorage.getStore();
    if (!context) return;
    const lang = context.lang || 'en';

    const target = interaction.options.getUser('target', true);
    const isBot = target.id === interaction.client.user.id;

    if (target.id === interaction.user.id) {
      return await replyV2(interaction, ContainerService.simple(Translator.t('economy', 'hack.no_self', lang)));
    }

    // Check Cooldown
    const user = await EconomyRepository.getUser(context.tenantId, interaction.user.id);
    if (user?.lastHack) {
      const minutesSince = (Date.now() - new Date(user.lastHack).getTime()) / 60000;
      if (minutesSince < 45) {
        const cooldownEmbed = ContainerService.create({
          title: Translator.t('economy', 'hack.cooldown_title', lang),
          description: Translator.t('economy', 'hack.cooldown_desc', lang, { time: Math.ceil(45 - minutesSince) }),
          image: flamebornConfig.economy.assets.cooldownBanner,
          color: '#F9AC19',
          interaction
        });
        return await replyV2(interaction, cooldownEmbed);
      }
    }

    const result = isBot 
      ? await CrimeService.prepareHackBot(context.tenantId)
      : await CrimeService.prepareHack(context.tenantId, target.id);

    if (!result.success) {
      return await replyV2(interaction, ContainerService.simple(`❌ ${result.scenario}`));
    }

    const sequence = result.sequence!;
    let currentStep = 0;

    const embed = ContainerService.create({
      title: isBot ? Translator.t('economy', 'hack.title_bot_progress', lang) : Translator.t('economy', 'hack.title_progress', lang),
      description: `${result.scenario}\n\n${Translator.t('economy', 'hack.desc_sequence', lang, { sequence: sequence.map(s => `\`${s}\``).join(' ') })}`,
      image: flamebornConfig.economy.assets.hackBanner,
      color: isBot ? '#FF0000' : '#7367F0',
      interaction
    });

    const rows = [
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId('hack_A').setLabel('A').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('hack_B').setLabel('B').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('hack_C').setLabel('C').setStyle(ButtonStyle.Primary)
      ),
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId('hack_D').setLabel('D').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('hack_E').setLabel('E').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('hack_F').setLabel('F').setStyle(ButtonStyle.Primary)
      )
    ];

    if (isBot) {
      rows.push(
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder().setCustomId('hack_X').setLabel('X').setStyle(ButtonStyle.Danger),
          new ButtonBuilder().setCustomId('hack_Z').setLabel('Z').setStyle(ButtonStyle.Danger)
        )
      );
    }

    const finalEmbed = ContainerService.create({
      ...embed as any,
      components: rows
    });

    await replyV2(interaction, finalEmbed);
    const msg = await interaction.fetchReply();

    const collector = msg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: isBot ? 10000 : 15000 // Bot is harder (10s)
    });

    collector.on('collect', async (i) => {
      if (i.user.id !== interaction.user.id) return;
      await i.deferUpdate().catch(() => {});

      const clicked = i.customId.split('_')[1];
      if (clicked === sequence[currentStep]) {
        currentStep++;
        
        if (currentStep === sequence.length) {
          collector.stop('success');
          await CrimeService.finalizeHack(context.tenantId, interaction.user.id, result.amount);
          await EconomyRepository.updateCooldown(context.tenantId, interaction.user.id, 'lastHack');
          
          const successEmbed = ContainerService.create({
            title: isBot ? Translator.t('economy', 'hack.title_bot_success', lang) : Translator.t('economy', 'hack.title_success', lang),
            description: isBot 
              ? Translator.t('economy', 'hack.desc_bot_success', lang, { amount: result.amount.toLocaleString() })
              : Translator.t('economy', 'hack.desc_success', lang, { amount: result.amount.toLocaleString() }),
            image: flamebornConfig.economy.assets.successBanner,
            color: '#28C76F',
            interaction
          });

          await replyV2(interaction, successEmbed);
        } else {
          const progressEmbed = ContainerService.create({
            title: isBot ? Translator.t('economy', 'hack.title_bot_progress', lang) : Translator.t('economy', 'hack.title_progress', lang),
            description: `${result.scenario}\n\n🔓 **Breach Sequence Required:**\n## ${sequence.map((s, idx) => idx < currentStep ? `~~${s}~~` : `\`${s}\``).join(' ')}\n\n*${Translator.t('economy', 'hack.keep_going', lang)}*`,
            image: flamebornConfig.economy.assets.hackBanner,
            color: isBot ? '#FF0000' : '#7367F0',
            interaction
          });
          await replyV2(interaction, progressEmbed);
        }
      } else {
        collector.stop('fail');
        const penalty = isBot ? Math.floor(Number(user?.embers || 0) * 0.7) : 500;
        await EconomyRepository.updateBalance(context.tenantId, interaction.user.id, { embers: -penalty });
        await EconomyRepository.updateCooldown(context.tenantId, interaction.user.id, 'lastHack');

        const failEmbed = ContainerService.create({
          title: isBot ? Translator.t('economy', 'hack.title_bot_fail', lang) : Translator.t('economy', 'hack.title_fail', lang),
          description: isBot 
            ? Translator.t('economy', 'hack.desc_bot_fail', lang, { penalty: penalty.toLocaleString() })
            : Translator.t('economy', 'hack.desc_fail', lang),
          image: flamebornConfig.economy.assets.failureBanner,
          color: '#EA5455',
          interaction
        });

        await replyV2(interaction, failEmbed);
      }
    });

    collector.on('end', async (_, reason) => {
      if (reason === 'time') {
        const penalty = isBot ? Math.floor(Number(user?.embers || 0) * 0.5) : 500;
        await EconomyRepository.updateBalance(context.tenantId, interaction.user.id, { embers: -penalty });
        await EconomyRepository.updateCooldown(context.tenantId, interaction.user.id, 'lastHack');

        const timeEmbed = ContainerService.create({
          title: Translator.t('economy', 'hack.title_timeout', lang),
          description: isBot 
            ? Translator.t('economy', 'hack.desc_bot_timeout', lang, { penalty: penalty.toLocaleString() })
            : Translator.t('economy', 'hack.desc_timeout', lang),
          image: flamebornConfig.economy.assets.failureBanner,
          color: '#EA5455',
          interaction
        });

        await replyV2(interaction, timeEmbed);
      }
    });
  }
};
