import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits } from 'discord.js';
import { RoutingService } from '../../../../services/RoutingService';
import { prisma } from '../../../../database/client';

export default {
  data: (sub: SlashCommandSubcommandBuilder) =>
    sub.setName('admin')
       .setDescription('🔧 Administrative Social Settings Management.')
       .addRoleOption(opt => opt.setName('header').setDescription('Separator role below which new social roles are created').setRequired(false))
       .addRoleOption(opt => opt.setName('footer').setDescription('Separator role above which new social roles are created').setRequired(false)),

  async execute(interaction: ChatInputCommandInteraction) {
    const { guildId, guild } = interaction;
    if (!guild) return;

    // 1. Strictly enforce Server Administrator permissions
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
        return await interaction.editReply({ content: '❌ You do not have permission to execute Social Administrative commands.' });
    }

    const tenantId = await RoutingService.resolveTenantId(guildId, 'economy');
    const headerRole = interaction.options.getRole('header');
    const footerRole = interaction.options.getRole('footer');

    if (!headerRole && !footerRole) {
        return await interaction.editReply({ content: '❌ Please specify at least one role (`header` or `footer`) to configure.' });
    }

    try {
        const updates: any = {};
        if (headerRole !== null) updates.socialHeaderRoleId = headerRole.id;
        if (footerRole !== null) updates.socialFooterRoleId = footerRole.id;

        await prisma.guild_settings.upsert({
            where: { guildId_tenantId: { guildId: guildId as string, tenantId: tenantId as string } },
            update: updates,
            create: {
                guildId: guildId as string,
                tenantId: tenantId as string,
                socialHeaderRoleId: headerRole?.id || null,
                socialFooterRoleId: footerRole?.id || null,
                createdAt: new Date(),
                updatedAt: new Date()
            }
        });

        let responseDesc = 'Social Role placement settings have been updated successfully:\n\n';
        if (headerRole) responseDesc += `💬 **Social Header:** <@&${headerRole.id}> (New social/marriage/family roles will be positioned directly below this role)\n`;
        if (footerRole) responseDesc += `💬 **Social Footer:** <@&${footerRole.id}> (New social/marriage/family roles will be positioned directly above this role)\n`;

        return await interaction.editReply({ content: `✅ **Social Settings Updated!**\n\n${responseDesc}` });
    } catch (err: any) {
        return await interaction.editReply({ content: `❌ **Failed to update social settings:** ${err.message}` });
    }
  }
};
