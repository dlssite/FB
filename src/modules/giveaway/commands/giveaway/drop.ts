import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction, MessageFlags } from 'discord.js';
import { GiveawayService } from '../../services/GiveawayService';
import { GiveawayRepository } from '../../database/GiveawayRepository';
import { tenantStorage } from '../../../../utils/context';
import { Translator } from '../../../../core/Translator';
import { ContainerService, replyV2 } from '../../../../utils/container';

export default {
  data: (sub: SlashCommandSubcommandBuilder) =>
    sub.setName('drop')
       .setDescription('Start an instant claim flash drop')
       .addIntegerOption(opt => opt.setName('claims').setDescription('Number of claims allowed').setRequired(true).setMinValue(1))
       .addStringOption(opt => opt.setName('prize').setDescription('The prize to drop').setRequired(true))
       .addStringOption(opt => opt.setName('description').setDescription('Optional description').setRequired(false))
       .addRoleOption(opt => opt.setName('req_role').setDescription('Required Role').setRequired(false))
       .addIntegerOption(opt => opt.setName('req_level').setDescription('Required Level').setRequired(false))
       .addIntegerOption(opt => opt.setName('req_balance').setDescription('Required Embers Balance').setRequired(false)),

  async execute(interaction: ChatInputCommandInteraction) {
    const context = tenantStorage.getStore();
    if (!context) return;

    const claims = interaction.options.getInteger('claims', true);
    const prize = interaction.options.getString('prize', true);
    const description = interaction.options.getString('description');
    const role = interaction.options.getRole('req_role');
    const level = interaction.options.getInteger('req_level');
    const balance = interaction.options.getInteger('req_balance');

    const requirements: any = {};
    if (role) requirements.roleId = role.id;
    if (level) requirements.minLevel = level;
    if (balance) requirements.minBalance = balance;

    const endTime = new Date(Date.now() + 86400000 * 365);

    const giveawayData = {
      prize,
      hostId: interaction.user.id,
      endTime,
      winners: claims,
      description,
      requirements,
      drop: true
    };

    // Send placeholder first to get messageId
    const placeholderBuilder = GiveawayService.buildGiveawayContainer(giveawayData, 'pending', 0, false);
    const message = await (interaction.channel as any)?.send({
      components: [placeholderBuilder],
      flags: MessageFlags.IsComponentsV2
    });

    if (!message) return;

    // DB create + cache (drops are NOT added to schedule — they end by claim count)
    await GiveawayRepository.createGiveaway({
      tenantId: context.tenantId,
      guildId: context.guildId,
      channelId: message.channelId,
      messageId: message.id,
      duration: 0,
      ...giveawayData
    });

    // Edit message with real messageId in button customId
    const finalBuilder = GiveawayService.buildGiveawayContainer(giveawayData, message.id, 0, false);
    await message.edit({ components: [finalBuilder], flags: MessageFlags.IsComponentsV2 }).catch(() => {});

    await replyV2(interaction, ContainerService.simple(`✅ ${Translator.t('giveaway', 'start_success', context.lang)}`));
  }
};
