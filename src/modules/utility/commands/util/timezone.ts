import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction, AutocompleteInteraction } from 'discord.js';
import { prisma } from '../../../../database/client';
import { flamebornConfig } from '../../../../config/flameborn.config';
import { ContainerService, replyV2 } from '../../../../utils/container';

// A subset of common timezones for the initial implementation
// In a production environment, this could be a full list or a library
const COMMON_TIMEZONES = [
  'UTC', 'GMT',
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Moscow',
  'Asia/Tokyo', 'Asia/Shanghai', 'Asia/Dubai', 'Asia/Singapore',
  'Australia/Sydney', 'Pacific/Auckland'
];

export default {
  data: (sub: SlashCommandSubcommandBuilder) =>
    sub.setName('timezone')
      .setDescription('Set or view user timezones')
      .addStringOption(opt => 
        opt.setName('action')
          .setDescription('What do you want to do?')
          .setRequired(true)
          .addChoices(
            { name: 'Set Timezone', value: 'set' },
            { name: 'View Timezone', value: 'view' }
          )
      )
      .addStringOption(opt => 
        opt.setName('zone')
          .setDescription('The timezone to set (e.g. Europe/London)')
          .setRequired(false)
          .setAutocomplete(true)
      )
      .addUserOption(opt => 
        opt.setName('target')
          .setDescription('The user to view the timezone of')
          .setRequired(false)
      ),

  async execute(interaction: ChatInputCommandInteraction) {
    const tenantId = flamebornConfig.bot.tenant.id;
    const action = interaction.options.getString('action', true);
    const zone = interaction.options.getString('zone');
    const target = interaction.options.getUser('target') || interaction.user;

    if (action === 'set') {
      if (!zone) {
        return await replyV2(interaction, ContainerService.create({
          title: 'Missing Information',
          description: '❌ Please provide a timezone to set.',
          color: '#EA5455',
          footer: true
        }));
      }

      // Validate Timezone
      try {
        Intl.DateTimeFormat(undefined, { timeZone: zone });
      } catch (e) {
        return await replyV2(interaction, ContainerService.create({
          title: 'Invalid Timezone',
          description: `❌ **${zone}** is not a valid timezone.\nExample: \`Europe/London\`, \`America/New_York\`, \`UTC\`.`,
          color: '#EA5455',
          footer: true
        }));
      }

      await prisma.user_timezones.upsert({
        where: { userId_tenantId: { userId: interaction.user.id, tenantId } },
        update: { timezone: zone, updatedAt: new Date() },
        create: { userId: interaction.user.id, tenantId, timezone: zone, updatedAt: new Date() }
      });

      return await replyV2(interaction, ContainerService.create({
        title: 'Timezone Set',
        description: `✅ Your timezone has been set to **${zone}**.`,
        color: '#28C76F',
        footer: true
      }));
    }

    if (action === 'view') {
      const userTz = await prisma.user_timezones.findUnique({
        where: { userId_tenantId: { userId: target.id, tenantId } }
      });

      if (!userTz) {
        const isSelf = target.id === interaction.user.id;
        return await replyV2(interaction, ContainerService.create({
          title: 'Timezone Not Set',
          description: isSelf 
            ? '❌ You haven\'t set your timezone yet. Use `/util timezone set` to set it.'
            : `❌ <@${target.id}> hasn't set their timezone yet.`,
          color: '#EA5455',
          footer: true
        }));
      }

      const now = new Date();
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: userTz.timezone,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
        weekday: 'long',
        month: 'long',
        day: 'numeric'
      });

      const localTime = formatter.format(now);

      return await replyV2(interaction, ContainerService.create({
        title: `Timezone for ${target.username}`,
        description: `🌍 **Zone:** ${userTz.timezone}\n⏰ **Local Time:** ${localTime}`,
        color: '#7367F0',
        footer: true,
        thumbnail: target.displayAvatarURL()
      }));
    }
  },

  async autocomplete(interaction: AutocompleteInteraction) {
    const focusedValue = interaction.options.getFocused().toLowerCase();
    const filtered = COMMON_TIMEZONES.filter(choice => choice.toLowerCase().includes(focusedValue));
    await interaction.respond(
      filtered.slice(0, 25).map(choice => ({ name: choice, value: choice }))
    );
  }
};
