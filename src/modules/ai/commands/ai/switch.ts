import { ChatInputCommandInteraction, SlashCommandSubcommandBuilder, PermissionFlagsBits } from 'discord.js';
import { AiRepository } from '../../database/AiRepository';
import { tenantStorage } from '../../../../utils/context';
import { ContainerService, replyV2 } from '../../../../utils/container';
import { getAvailablePersonas } from '../../personas';

export default {
  data: (sub: SlashCommandSubcommandBuilder) =>
    sub.setName('switch')
       .setDescription('Switch the active AI persona for this server.')
       .addStringOption(opt => 
         opt.setName('persona')
            .setDescription('The Flameborn persona to activate')
            .setRequired(true)
            .addChoices(
              { name: 'Emberlyn (Light, Caring)', value: 'emberlyn' },
              { name: 'Kiaren (Shadow, Mystery)', value: 'kiaren' },
              { name: 'Saphyran (Music, Artistry)', value: 'saphyran' },
              { name: 'Liber (Knowledge, Wisdom)', value: 'liber' }
            )
       ),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
      await interaction.editReply({ content: '❌ You need Manage Server permissions to configure AI settings.' });
      return;
    }

    const personaName = interaction.options.getString('persona', true);
    const context = tenantStorage.getStore();

    if (!context || !interaction.guildId) return;

    await AiRepository.upsertSettings(interaction.guildId, context.tenantId, {
      persona: personaName,
      enabled: true
    });

    const personaMap: Record<string, string> = {
      emberlyn: '🔥 **Emberlyn** (The Radiant Flame) — Warm, caring, and compassionate.',
      kiaren: '🌑 **Kiaren** (The Shadow Twin) — Cold, mysterious, and calculated.',
      saphyran: '🎵 **Saphyran** (The Harmonic Pulse) — Lively, artistic, and passionate about music.',
      liber: '📚 **Liber** (The Keeper of Knowledge) — Calm, wise, and deeply knowledgeable.'
    };

    const msg = `✅ AI Persona switched!\n\n${personaMap[personaName] || 'Unknown persona'}`;
    const payload = ContainerService.simple(msg, { color: '#00FF00', withFooter: true, interaction });
    await replyV2(interaction, payload);
  }
};
