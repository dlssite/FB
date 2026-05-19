import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction, MessageFlags } from 'discord.js';
import { TodService } from '../../services/TodService';
import { TodRepository } from '../../database/TodRepository';
import { ContainerService, sendV2 } from '../../../../utils/container';
import { flamebornConfig } from '../../../../config/flameborn.config';

export default {
  data: (sub: SlashCommandSubcommandBuilder) =>
    sub.setName('single')
      .setDescription('🎭 Get a single Truth or Dare challenge immediately.')
      .addStringOption(opt => 
        opt.setName('type')
          .setDescription('Choose between Truth or Dare')
          .setRequired(true)
          .addChoices(
            { name: 'Truth', value: 'TRUTH' },
            { name: 'Dare', value: 'DARE' },
            { name: 'Random', value: 'RANDOM' }
          )
      )
      .addStringOption(opt =>
        opt.setName('tier')
          .setDescription('Choose intensity (Respects server max)')
          .addChoices(
            { name: 'Soft', value: 'SOFT' },
            { name: 'Party', value: 'PARTY' },
            { name: 'Spicy', value: 'SPICY' }
          )
      ),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) return;
    const tenantId = flamebornConfig.bot.tenant.id;

    let typeRaw = interaction.options.getString('type');
    if (!typeRaw) {
      typeRaw = (interaction as any)._leafSubName;
    }

    if (!typeRaw) {
      return await interaction.reply({ content: '❌ Please specify a type: `truth` or `dare`.', ephemeral: true });
    }

    const settings = await TodRepository.getSettings(tenantId, interaction.guild.id);
    const maxTier = settings.maxIntensity;

    const tiers: any = { SOFT: 0, PARTY: 1, SPICY: 2 };
    let targetTier = (interaction.options.getString('tier') || 'SOFT') as any;

    if (tiers[targetTier] > tiers[maxTier]) {
      targetTier = maxTier;
    }

    // NSFW Gating
    if (targetTier === 'SPICY' && !(interaction.channel as any).nsfw) {
      return await interaction.reply({ content: '❌ **Spicy** tier can only be used in NSFW-enabled channels!', flags: MessageFlags.Ephemeral });
    }

    let type = typeRaw.toUpperCase() as any;
    if (type === 'RANDOM') type = Math.random() > 0.5 ? 'TRUTH' : 'DARE';

    const question = await TodService.fetchQuestion(type, targetTier, interaction.channelId);
    if (!question) return;

    const container = ContainerService.create({
      layout: 'tod',
      title: `🎭 ${type} Challenge`,
      image: flamebornConfig.tod.assets.panelBanner,
      description: `**Question:**\n> ${question.text}`,
      color: type === 'TRUTH' ? '#7367F0' : '#EA5455',
      footer: `Challenge for ${interaction.user.username} • Tier: ${targetTier}`,
      interaction
    });

    return await sendV2(interaction.channel, container);
  }
};
