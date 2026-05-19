import { SlashCommandSubcommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { Translator } from '../../../../core/Translator';
import { getTenantContext } from '../../../../utils/context';
import { ContainerService } from '../../../../utils/container';

export default {
  data: (sub: SlashCommandSubcommandBuilder) =>
    sub.setName('ping')
      .setDescription('Check bot latency'),
      
  async execute(interaction: ChatInputCommandInteraction) {
    const { tenantId, lang } = getTenantContext();
    const sent = await interaction.editReply({ content: 'Pinging...' });
    const latency = sent.createdTimestamp - interaction.createdTimestamp;
    const heartbeat = interaction.client.ws.ping;
    
    await interaction.editReply({
      content: null,
      ...ContainerService.create({
        title: Translator.t('utility', 'ping.title', lang),
        fields: [
          { name: Translator.t('utility', 'ping.latency', lang), value: `\`${latency}ms\`` },
          { name: Translator.t('utility', 'ping.heartbeat', lang), value: `\`${heartbeat}ms\`` },
          { name: Translator.t('utility', 'ping.tenant', lang), value: `\`${tenantId}\`` }
        ],
        interaction
      })
    });
  },
};
