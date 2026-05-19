import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { ContainerService, replyV2 } from '../../../../utils/container';
import { getLavalink } from '../../services/LavalinkManager';

export default {
  data: (sub: SlashCommandSubcommandBuilder) =>
    sub.setName('nodes')
       .setDescription('📡 Check the health and status of the Lavalink cluster nodes.'),

  async execute(interaction: ChatInputCommandInteraction) {
    const lava = getLavalink();
    
    if (!lava) {
      return await replyV2(interaction, ContainerService.create({
        title: '❌ Cluster Offline',
        description: 'The Shoukaku manager has not been initialized.',
        color: '#E74C3C',
        interaction
      }));
    }

    const nodes = Array.from(lava.nodes.values());
    const nodeStatus = nodes.map(node => {
      const isOnline = (node as any).state === 1 || (node as any).state === 'CONNECTED';
      const emoji = isOnline ? '✅' : '❌';
      const stateText = isOnline ? 'Online' : 'Offline';
      const url = (node as any).options?.url || (node as any).url || 'Unknown URL';
      return `**${emoji} ${node.name}**: ${stateText} (\`${url}\`)`;
    }).join('\n');

    const healthyCount = nodes.filter(n => (n as any).state === 1 || (n as any).state === 'CONNECTED').length;

    await replyV2(interaction, ContainerService.create({
      title: '📡 Lavalink Cluster Status',
      description: `Current cluster health: **${healthyCount}/${nodes.length}** nodes operational.\n\n${nodeStatus}`,
      color: healthyCount > 0 ? '#2ECC71' : '#E74C3C',
      footer: true,
      interaction
    }));
  }
};
