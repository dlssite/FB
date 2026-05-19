import { ChatInputCommandInteraction, SlashCommandSubcommandBuilder, PermissionFlagsBits } from 'discord.js';
import { AiRepository } from '../../database/AiRepository';
import { tenantStorage } from '../../../../utils/context';
import { ContainerService, replyV2 } from '../../../../utils/container';
import { flamebornPersonas, getAvailablePersonas } from '../../personas';

export default {
  data: (sub: SlashCommandSubcommandBuilder) =>
    sub.setName('persona')
       .setDescription('View available AI personas or get current persona info.')
       .addStringOption(opt => 
         opt.setName('action')
            .setDescription('What you want to do')
            .setRequired(false)
            .addChoices(
              { name: 'List all personas', value: 'list' },
              { name: 'Get current persona', value: 'current' }
            )
       ),

  async execute(interaction: ChatInputCommandInteraction) {
    const action = interaction.options.getString('action') || 'list';
    const context = tenantStorage.getStore();

    if (!context || !interaction.guildId) return;

    if (action === 'list') {
      const personaList = Object.entries(flamebornPersonas)
        .map(([key, persona]) => `**${persona.name}** — ${persona.title}\n*${persona.description}*`)
        .join('\n\n');

      const msg = `🧠 **Available Flameborn Personas:**\n\n${personaList}\n\n✨ Use \`/ai switch\` to change the active persona!`;
      const payload = ContainerService.simple(msg, { color: '#7367F0', withFooter: true, interaction });
      await replyV2(interaction, payload);
    } else if (action === 'current') {
      const settings = await AiRepository.getSettings(interaction.guildId, context.tenantId);
      const personaName = settings?.persona || 'default (Emberlyn)';
      const persona = flamebornPersonas[personaName.toLowerCase()];
      
      if (persona) {
        const msg = `🧠 **Current Persona:** ${persona.name}\n**Title:** ${persona.title}\n**Description:** ${persona.description}`;
        const payload = ContainerService.simple(msg, { color: '#7367F0', withFooter: true, interaction });
        await replyV2(interaction, payload);
      } else {
        const msg = `🧠 **Current Persona:** ${personaName}`;
        const payload = ContainerService.simple(msg, { color: '#7367F0', withFooter: true, interaction });
        await replyV2(interaction, payload);
      }
    }
  }
};

