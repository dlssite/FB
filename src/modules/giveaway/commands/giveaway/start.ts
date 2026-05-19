import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction, MessageFlags } from 'discord.js';
import { GiveawayService } from '../../services/GiveawayService';
import { GiveawayRepository } from '../../database/GiveawayRepository';
import { tenantStorage } from '../../../../utils/context';
import { Translator } from '../../../../core/Translator';
import { ContainerService, replyV2 } from '../../../../utils/container';

function parseDuration(input: string): number {
  const match = input.match(/^(\d+)([smhd])$/);
  if (!match) return 0;
  const val = parseInt(match[1]);
  const unit = match[2];
  switch(unit) {
    case 's': return val * 1000;
    case 'm': return val * 60000;
    case 'h': return val * 3600000;
    case 'd': return val * 86400000;
    default: return 0;
  }
}

export default {
  data: (sub: SlashCommandSubcommandBuilder) =>
    sub.setName('start')
       .setDescription('Start a new duration-based giveaway')
       .addStringOption(opt => opt.setName('duration').setDescription('Duration (e.g. 1d, 2h, 30m)').setRequired(true))
       .addIntegerOption(opt => opt.setName('winners').setDescription('Number of winners').setRequired(true).setMinValue(1))
       .addStringOption(opt => opt.setName('prize').setDescription('The prize to give away').setRequired(true))
       .addStringOption(opt => opt.setName('description').setDescription('Optional description').setRequired(false))
       .addUserOption(opt => opt.setName('sponsor').setDescription('Sponsor of this giveaway').setRequired(false))
       .addRoleOption(opt => opt.setName('req_role').setDescription('Required Role').setRequired(false))
       .addIntegerOption(opt => opt.setName('req_level').setDescription('Required Level').setRequired(false))
       .addIntegerOption(opt => opt.setName('req_balance').setDescription('Required Embers Balance').setRequired(false))
       .addStringOption(opt => opt.setName('color').setDescription('Hex Color (e.g. #FF0000)').setRequired(false)),

  async execute(interaction: ChatInputCommandInteraction) {
    const context = tenantStorage.getStore();
    if (!context) return;

    const durationInput = interaction.options.getString('duration', true);
    const durationMs = parseDuration(durationInput);

    if (durationMs <= 0) {
      return await replyV2(interaction, ContainerService.simple(`❌ ${Translator.t('giveaway', 'error_duration', context.lang)}`));
    }

    const winners = interaction.options.getInteger('winners', true);
    const prize = interaction.options.getString('prize', true);
    const description = interaction.options.getString('description');
    const sponsor = interaction.options.getUser('sponsor');
    const role = interaction.options.getRole('req_role');
    const level = interaction.options.getInteger('req_level');
    const balance = interaction.options.getInteger('req_balance');
    const color = interaction.options.getString('color');

    const requirements: any = {};
    if (role) requirements.roleId = role.id;
    if (level) requirements.minLevel = level;
    if (balance) requirements.minBalance = balance;

    const endTime = new Date(Date.now() + durationMs);

    const giveawayData = {
      prize,
      hostId: interaction.user.id,
      sponsorId: sponsor?.id || null,
      endTime,
      winners,
      color,
      description,
      requirements,
      drop: false
    };

    // Send a placeholder message first to get the messageId
    const placeholderBuilder = GiveawayService.buildGiveawayContainer(giveawayData, 'pending', 0, false);
    const message = await (interaction.channel as any)?.send({
      components: [placeholderBuilder],
      flags: MessageFlags.IsComponentsV2
    });

    if (!message) return;

    // DB create (also caches in Redis + registers in schedule)
    await GiveawayRepository.createGiveaway({
      tenantId: context.tenantId,
      guildId: context.guildId,
      channelId: message.channelId,
      messageId: message.id,
      duration: durationMs,
      ...giveawayData
    });

    // Edit message to embed the real messageId in the button customId
    const finalBuilder = GiveawayService.buildGiveawayContainer(giveawayData, message.id, 0, false);
    await message.edit({ components: [finalBuilder], flags: MessageFlags.IsComponentsV2 }).catch(() => {});

    await replyV2(interaction, ContainerService.simple(`✅ ${Translator.t('giveaway', 'start_success', context.lang)}`));
  }
};
