import { SlashCommandSubcommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } from 'discord.js';
import { TransportationRepository } from '../../database/TransportationRepository';
import { TerritoryRepository } from '../../../territory/database/TerritoryRepository';
import { ContainerService, replyV2, sendV2 } from '../../../../utils/container';
import { RoutingService } from '../../../../services/RoutingService';

export default {
  data: (sub: SlashCommandSubcommandBuilder) => 
    sub.setName('portal')
       .setDescription('🌀 Open a spatial rift (Instant Travel).')
       .addStringOption(opt => opt.setName('nation').setDescription('The nation to link to').setRequired(true))
       .addIntegerOption(opt => opt.setName('uses').setDescription('Number of times the portal can be used (Energy)').setMinValue(1)),

  async execute(interaction: any) {
    const guild = interaction.guild;
    const member = interaction.member;
    const channel = interaction.channel;
    const options = interaction.options;

    const guildId = guild.id;
    const tenantId = await RoutingService.resolveTenantId(guildId, 'economy');

    const nationName = options.getString('nation', true);
    const requestedUses = options.getInteger('uses');

    // 1. Resolve Nation
    const allNations = await TerritoryRepository.listByGuild(tenantId, guildId);
    const nation = allNations.find(n => n.name.toLowerCase() === nationName.toLowerCase());
    if (!nation) return await replyV2(interaction, ContainerService.simple(`❌ Nation **${nationName}** not found.`));

    // 2. Permission Check
    const isOwner = member.id === guild.ownerId || member.permissions.has(PermissionFlagsBits.ManageGuild);
    const isPatron = nation.patronRoleId && member.roles.cache.has(nation.patronRoleId);

    if (!isOwner && !isPatron) {
      return await replyV2(interaction, ContainerService.simple('❌ You do not have the authority to open a rift to this nation.'));
    }

    // 3. Apply Usage Limits
    let maxUses = requestedUses || 10;
    if (!isOwner && maxUses > 10) maxUses = 10; // Cap for Patrons

    // 4. Send Portal Message
    const portalEmbed = ContainerService.create({
      title: '🌀 Spatial Rift Detected',
      description: `A gateway to **${nation.name}** has been stabilized.\n\nEnergy: **${maxUses}** / ${maxUses}\nStatus: \`Stable\``,
      color: '#7367F0',
      media: nation.imageUrl ? [nation.imageUrl] : [],
      components: [
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId(`transport_portal_${nation.id}`)
            .setLabel(`Enter ${nation.name}`)
            .setStyle(ButtonStyle.Primary)
        )
      ],
      interaction,
      footer: true
    }) as any;

    const portalMsg = await sendV2(channel, { embeds: portalEmbed.embeds, components: portalEmbed.components });

    // 5. Record Portal
    await TransportationRepository.createPortal(tenantId, guildId, {
      name: `Rift: ${nation.name}`,
      creatorId: member.id,
      type: isOwner ? 'owner' : 'patron',
      channelId: channel.id,
      messageId: portalMsg.id,
      destinationNationId: nation.id,
      maxUses: maxUses,
      title: 'Spatial Rift Detected',
      description: `A gateway to **${nation.name}** has been stabilized.`,
      imageUrl: nation.imageUrl,
      expirationTime: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24h
    });

    return await replyV2(interaction, ContainerService.simple(`✅ Dimensional Rift opened in <#${channel.id}>.`));
  }
};
