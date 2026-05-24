import { ChatInputCommandInteraction, MessageFlags } from 'discord.js';
import { Logger } from '../../../../utils/logger';
import { RoutingService } from '../../../../services/RoutingService';
import { AddonService } from '../../../../services/AddonService';
import { ReactionPanelService } from '../../services/ReactionPanelService';
import { EmbedService } from '../../../../utils/embed';
import { replyV2, ContainerService } from '../../../../utils/container';

export async function execute(interaction: ChatInputCommandInteraction) {
  if (!interaction.guild || !interaction.member) return;

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const guildId = interaction.guild.id;
  const tenantId = await RoutingService.resolveTenantId(guildId, 'reactions');

  const isEnabled = await AddonService.isEnabled(tenantId, guildId, 'reactions');
  if (!isEnabled) {
    const errorContainer = EmbedService.containerError('Reactions module is not enabled', 'ADDON_DISABLED');
    return await replyV2(interaction, errorContainer);
  }

  const title = interaction.options.getString('title', true);
  const description = interaction.options.getString('description');
  const channel = interaction.options.getChannel('channel', true);

  try {
    const result = await ReactionPanelService.deployPanel(interaction.guild, channel.id, {
      tenantId,
      title,
      description: description || undefined,
      items: [
        {
          emoji: '✅',
          label: 'Get Started',
          description: 'Add your first role',
          roleIds: [],
          mutuallyExclusive: false
        }
      ]
    });

    const container = ContainerService.create({
      title: '✅ Panel Created',
      description: `Reaction panel **${title}** has been created!\n\nUse \`/reactions item add\` to add roles.`,
      color: '#28C76F',
      footer: true
    });

    return await replyV2(interaction, container);
  } catch (err: any) {
    Logger.error('Panel Create Error', err);
    const errorContainer = EmbedService.containerError(
      err.message || 'Failed to create panel',
      'PANEL_CREATE_ERR'
    );
    return await replyV2(interaction, errorContainer);
  }
}
