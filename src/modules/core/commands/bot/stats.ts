import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction, version } from 'discord.js';
import os from 'node:os';
import { ContainerService, replyV2 } from '../../../../utils/container';
import { flamebornConfig } from '../../../../config/flameborn.config';

export default {
  data: (sub: SlashCommandSubcommandBuilder) =>
    sub.setName('stats')
      .setDescription('View technical performance metrics'),
      
  async execute(interaction: ChatInputCommandInteraction) {
    const uptime = process.uptime();
    const memory = process.memoryUsage().heapUsed / 1024 / 1024;
    
    await replyV2(interaction, ContainerService.create({
      title: '📊 System Metrics',
      media: [flamebornConfig.assets.statsBanner],
      fields: [
        { name: '🕒 Uptime', value: `\`${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m\`` },
        { name: '🧠 Memory', value: `\`${memory.toFixed(2)} MB\`` },
        { name: '📦 Node.js', value: `\`${process.version}\`` },
        { name: '🛡️ Discord.js', value: `\`v${version}\`` },
        { name: '🖥️ OS', value: `\`${os.platform()} ${os.arch()}\`` }
      ],
      interaction
    }));
  },
};
