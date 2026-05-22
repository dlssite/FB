import { Interaction, PermissionsBitField, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, MessageFlags } from 'discord.js';
import { prisma } from '../../../database/client';
import { Logger } from '../../../utils/logger';
import { ContainerService } from '../../../utils/container';
import { RoutingService } from '../../../services/RoutingService';
import { AddonService } from '../../../services/AddonService';

export default {
  name: 'interactionCreate',
  once: false,
  async execute(interaction: Interaction) {
    if (!interaction.guild) return;

    const guildId = interaction.guild.id;
    const tenantId = await RoutingService.resolveTenantId(guildId, 'tempvoice');
    
    // Gatekeeper Check: Is Tempvoice enabled?
    const isEnabled = await AddonService.isEnabled(tenantId, guildId, 'tempvoice');
    if (!isEnabled) return;

    // Handle Button Interactions
    if (interaction.isButton() && interaction.customId.startsWith('tv_static_')) {
      const action = interaction.customId.replace('tv_static_', ''); // lock, unlock, hide, show, rename, limit, transfer

      try {
        if (action === 'rename') {
          const modal = new ModalBuilder().setCustomId(`tvmodal_static_rename`).setTitle('Rename Channel');
          const nameInput = new TextInputBuilder()
            .setCustomId('newName')
            .setLabel('New Channel Name')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMaxLength(100);
          modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(nameInput));
          return interaction.showModal(modal);
        }

        if (action === 'limit') {
          const modal = new ModalBuilder().setCustomId(`tvmodal_static_limit`).setTitle('Set User Limit');
          const limitInput = new TextInputBuilder()
            .setCustomId('newLimit')
            .setLabel('New Limit (0 for unlimited)')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMaxLength(2);
          modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(limitInput));
          return interaction.showModal(modal);
        }

        // For non-modal buttons, defer immediately to prevent "Unknown interaction" timeouts
        await interaction.deferReply({ flags: (MessageFlags.IsComponentsV2 as any || 32768) | (MessageFlags.Ephemeral as any || 64) });

        const session = await prisma.tempvoice_sessions.findFirst({
          where: { ownerId: interaction.user.id, guildId: interaction.guild.id, status: 'active' }
        });

        if (!session) {
          return interaction.editReply({ content: '❌ You do not have an active TempVoice session.' });
        }

        const channelId = session.channelId;
        const channel = await interaction.guild.channels.fetch(channelId).catch(() => null);
        
        if (!channel || !channel.isVoiceBased()) {
          return interaction.editReply({ content: '❌ Your channel could not be found. It may have been deleted.' });
        }

        const everyoneRole = interaction.guild.roles.everyone;

        if (action === 'lock') {
          await channel.permissionOverwrites.edit(everyoneRole, { Connect: false });
          return interaction.editReply({ content: '🔒 Channel Locked. Only trusted users can join.' });
        }
        
        if (action === 'unlock') {
          await channel.permissionOverwrites.edit(everyoneRole, { Connect: true });
          return interaction.editReply({ content: '🔓 Channel Unlocked. Anyone can join.' });
        }
        
        if (action === 'hide') {
          await channel.permissionOverwrites.edit(everyoneRole, { ViewChannel: false });
          return interaction.editReply({ content: '👻 Channel Hidden (Ghost Mode). Only trusted users can see it.' });
        }
        
        if (action === 'show') {
          await channel.permissionOverwrites.edit(everyoneRole, { ViewChannel: true });
          return interaction.editReply({ content: '👀 Channel Visible.' });
        }

        if (action === 'transfer') {
          return interaction.editReply({ content: 'Ownership transfer is under construction. Please use the /tempvoice command.' });
        }

      } catch (err) {
        Logger.error(`Error handling tempvoice static button: ${interaction.customId}`, err);
        return interaction.editReply({ content: 'An error occurred processing your request.' }).catch(() => {});
      }
    }

    // Handle Modal Submits
    if (interaction.isModalSubmit() && interaction.customId.startsWith('tvmodal_static_')) {
      const action = interaction.customId.replace('tvmodal_static_', '');

      try {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const session = await prisma.tempvoice_sessions.findFirst({
          where: { ownerId: interaction.user.id, guildId: interaction.guild.id, status: 'active' }
        });

        if (!session) {
          return interaction.editReply({ content: '❌ You do not have an active TempVoice session.' });
        }

        const channel = await interaction.guild.channels.fetch(session.channelId).catch(() => null);
        if (!channel || !channel.isVoiceBased()) {
           return interaction.editReply({ content: '❌ Your channel could not be found. It may have been deleted.' });
        }

        if (action === 'rename') {
          const newName = interaction.fields.getTextInputValue('newName');
          await channel.setName(newName);
          
          await prisma.tempvoice_profiles.update({
            where: { userId_tenantId: { userId: interaction.user.id, tenantId: session.tenantId } },
            data: { preferredName: newName }
          });

          return interaction.editReply({ content: `✅ Channel renamed to **${newName}** and saved to your profile!` });
        }

        if (action === 'limit') {
          const newLimitStr = interaction.fields.getTextInputValue('newLimit');
          const newLimit = parseInt(newLimitStr, 10);
          
          if (isNaN(newLimit) || newLimit < 0 || newLimit > 99) {
             return interaction.editReply({ content: '❌ Invalid limit. Must be a number between 0 and 99.' });
          }

          await channel.setUserLimit(newLimit);
          
          await prisma.tempvoice_profiles.update({
            where: { userId_tenantId: { userId: interaction.user.id, tenantId: session.tenantId } },
            data: { preferredLimit: newLimit }
          });

          return interaction.editReply({ content: `✅ User limit set to **${newLimit === 0 ? 'Unlimited' : newLimit}** and saved to your profile!` });
        }
      } catch (err) {
        Logger.error(`Error handling tempvoice static modal submit: ${interaction.customId}`, err);
        return interaction.editReply({ content: 'An error occurred processing your request.' }).catch(() => {});
      }
    }
  }
};
