import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction, ChannelType, PermissionFlagsBits } from 'discord.js';
import { prisma } from '../../../../database/client';
import { ContainerService, replyV2 } from '../../../../utils/container';
import { tenantStorage } from '../../../../utils/context';

export default {
  data: (sub: SlashCommandSubcommandBuilder) =>
    sub.setName('setting')
       .setDescription('⚙️ Configure the birthday celebration engine (Admin Only).')
       .addChannelOption(opt => opt.setName('channel').setDescription('The channel for birthday announcements').addChannelTypes(ChannelType.GuildText))
       .addRoleOption(opt => opt.setName('role').setDescription('Role to give to the birthday user'))
       .addRoleOption(opt => opt.setName('ping_role').setDescription('Role to ping in the announcement'))
       .addIntegerOption(opt => opt.setName('bonus').setDescription('Fixed server-funded Embers to gift (e.g. 50)'))
       .addStringOption(opt => opt.setName('message').setDescription('Custom message (Use {user}, {age}, {zodiac})'))
       .addStringOption(opt => opt.setName('color').setDescription('Embed Hex Color (e.g. #FFD700)'))
       .addStringOption(opt => opt.setName('banner').setDescription('Custom background image URL')),
       
  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
      return interaction.editReply({ content: '❌ You need `Manage Guild` permissions to use this command.' });
    }

    const context = tenantStorage.getStore();
    if (!context) return;

    let setting = await prisma.birthday_settings.findUnique({
      where: { 
        guildId_tenantId: {
          guildId: context.guildId,
          tenantId: context.tenantId
        }
      }
    });

    if (!setting) {
      setting = await prisma.birthday_settings.create({
        data: { 
          guildId: context.guildId,
          tenantId: context.tenantId
        }
      });
    }

    const channel = interaction.options.getChannel('channel');
    const role = interaction.options.getRole('role');
    const pingRole = interaction.options.getRole('ping_role');
    const bonus = interaction.options.getInteger('bonus');
    const message = interaction.options.getString('message');
    const color = interaction.options.getString('color');
    const banner = interaction.options.getString('banner');

    const updateData: any = {};
    if (channel) updateData.channelId = channel.id;
    if (role) updateData.roleId = role.id;
    if (pingRole) updateData.pingRoleId = pingRole.id;
    if (bonus !== null) updateData.bonusEmbers = bonus;
    if (message) updateData.message = message;
    if (color) updateData.embedColor = color;
    if (banner) updateData.bgUrl = banner;

    const isViewing = Object.keys(updateData).length === 0;

    if (!isViewing) {
      setting = await prisma.birthday_settings.update({
        where: { 
          guildId_tenantId: {
            guildId: context.guildId,
            tenantId: context.tenantId
          }
        },
        data: updateData
      });
    }

    const container = ContainerService.create({
      title: isViewing ? '⚙️ Birthday Studio — Current Settings' : '✅ Birthday Studio — Settings Updated',
      description: `📢 **Channel:** ${setting.channelId ? `<#${setting.channelId}>` : '`System Default`'}
🎁 **Birthday Role:** ${setting.roleId ? `<@&${setting.roleId}>` : '`None`'}
🔔 **Ping Role:** ${setting.pingRoleId ? `<@&${setting.pingRoleId}>` : '`None`'}
💠 **Bonus Embers:** \`${setting.bonusEmbers}\`
🎨 **Theme Color:** \`${setting.embedColor || '#FFD700'}\`
🖼️ **Banner:** ${setting.bgUrl ? `[View Image](${setting.bgUrl})` : '`Default Skia Engine`'}

✉️ **Custom Message:**
${setting.message || '`Default Greeting`'}`,
      color: setting.embedColor || '#FFD700',
      footer: isViewing ? 'Use options to modify these settings' : 'Settings saved successfully',
      interaction
    });

    await replyV2(interaction, container);
  }
};
