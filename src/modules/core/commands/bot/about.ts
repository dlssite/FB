import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { ContainerService, replyV2 } from '../../../../utils/container';

export default {
  data: (sub: SlashCommandSubcommandBuilder) =>
    sub.setName('about')
      .setDescription('Learn about the Flameborn bot'),
      
  async execute(interaction: ChatInputCommandInteraction) {
    await replyV2(interaction, ContainerService.create({
      title: '🤖 About Flameborn',
      description: 'Flameborn is a production-grade, multi-tenant bot designed for elite server management and community engagement.',
      fields: [
        { name: '🚀 Version', value: 'v2.0.0 (Modular Rewrite)' },
        { name: '🛡️ Security', value: 'Context-isolated multi-tenancy' }
      ],
      color: '#7367F0',
      footer: true,
      interaction
    }));
  },
};
