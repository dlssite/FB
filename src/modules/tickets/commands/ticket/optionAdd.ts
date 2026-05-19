import { ChatInputCommandInteraction, MessageFlags, StringSelectMenuBuilder, ActionRowBuilder } from 'discord.js';
import { prisma } from '../../../../database/client';
import { flamebornConfig } from '../../../../config/flameborn.config';
import { ContainerService, replyV2 } from '../../../../utils/container';

export async function execute(interaction: ChatInputCommandInteraction) {
  const tenantId = flamebornConfig.bot.tenant.id;
  const panelId = interaction.options.getString('panel_id', true);
  const name = interaction.options.getString('name', true);
  const staffRole = interaction.options.getRole('staff_role', true);
  const logs = interaction.options.getChannel('logs', true);
  const category = interaction.options.getChannel('category', true);
  const emoji = interaction.options.getString('emoji');

  const panel = await prisma.ticket_panels.findUnique({
    where: { messageId_tenantId: { messageId: panelId, tenantId } }
  });

  if (!panel) {
    const errorContainer = ContainerService.create({ title: 'Invalid Action', description: '❌ Panel not found.', color: '#EA5455', footer: true });
    return await replyV2(interaction, errorContainer);
  }

  await prisma.ticket_configs.create({
    data: {
      guildId: interaction.guildId!,
      tenantId,
      panelMessageId: panel.messageId,
      typeName: name,
      typeEmoji: emoji,
      staffRoleId: staffRole.id,
      logsChannelId: logs.id,
      transcriptChannelId: logs.id,
      ticketCategoryId: category.id
    }
  });

  // Rebuild Panel Message
  await updatePanelMessage(panel.messageId, interaction.client);
  
  const successContainer = ContainerService.create({
    title: 'Option Added',
    description: `✅ Option **${name}** added to panel.`,
    color: '#28C76F',
    footer: true
  });
  return await replyV2(interaction, successContainer);
}

/**
 * Helper to update the panel message with the latest options.
 */
async function updatePanelMessage(messageId: string, client: any) {
  const tenantId = flamebornConfig.bot.tenant.id;
  const panel = await prisma.ticket_panels.findUnique({
    where: { messageId_tenantId: { messageId, tenantId } }
  });
  if (!panel) return;

  const configs = await prisma.ticket_configs.findMany({
    where: { panelMessageId: messageId, tenantId }
  });

  const channel = await client.channels.fetch(panel.channelId).catch(() => null);
  if (!channel || !channel.isTextBased()) return;

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`ticket_panel_select_${messageId}`)
    .setPlaceholder('Select a support category...');

  configs.forEach(cfg => {
    selectMenu.addOptions({
      label: cfg.typeName,
      value: cfg.id.toString(),
      emoji: cfg.typeEmoji || '🎫'
    });
  });

  const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

  const container = ContainerService.create({
    title: `🎫 ${panel.title}`,
    description: panel.description || 'Please select an option below.',
    image: flamebornConfig.tickets.assets.panelBanner,
    color: '#8be9fd',
    footer: true,
    components: [row]
  });

  const body = {
    flags: MessageFlags.IsComponentsV2,
    components: container.components.map(c => (c.toJSON ? c.toJSON() : c)),
  };

  await client.rest.patch(
    `/channels/${channel.id}/messages/${messageId}`,
    { body }
  );
}
