import { ChatInputCommandInteraction, TextChannel, MessageFlags } from 'discord.js';
import { prisma } from '../../../../database/client';
import { flamebornConfig } from '../../../../config/flameborn.config';
import { ContainerService, sendV2, replyV2 } from '../../../../utils/container';

export async function execute(interaction: ChatInputCommandInteraction) {
  const tenantId = flamebornConfig.bot.tenant.id;
  const title = interaction.options.getString('title', true);
  const desc = interaction.options.getString('description', true);
  const channel = interaction.options.getChannel('channel', true) as TextChannel;

  const container = ContainerService.create({
    title: `🎫 ${title}`,
    description: `${desc}\n\n*No options configured yet. Use \`/ticket option add\` to add options.*`,
    image: flamebornConfig.tickets.assets.panelBanner,
    color: '#8be9fd',
    footer: true
  });

  // Send dummy message first
  const msg = await sendV2(channel, container);

  await prisma.ticket_panels.create({
    data: {
      guildId: interaction.guildId!,
      tenantId,
      channelId: channel.id,
      messageId: msg.id,
      title,
      description: desc,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  });

  const successContainer = ContainerService.create({
    title: 'Panel Deployed',
    description: `✅ Panel deployed in <#${channel.id}>.\nPanel ID: **${msg.id}**`,
    color: '#28C76F',
    footer: true
  });
  return await replyV2(interaction, successContainer);
}
