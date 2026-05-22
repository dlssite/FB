import { Events, Message } from 'discord.js';
import { ContainerService } from '../../../utils/container';
import { UtilityRepository } from '../database/UtilityRepository';
import { TenantRepository } from '../../../repositories/TenantRepository';
import { GuildService } from '../../../services/GuildService';
import { AddonService } from '../../../services/AddonService';
import { Translator } from '../../../core/Translator';

export default {
  name: Events.MessageCreate,
  once: false,
  async execute(message: Message) {
    if (message.author.bot || !message.guild) return;

    const guildId = message.guild.id;
    const tenantId = await TenantRepository.getTenantForGuild(guildId) || process.env.TENANT_ID || 'tenant_alpha_01';
    
    // Gatekeeper Check: Is Utility enabled?
    const isEnabled = await AddonService.isEnabled(tenantId, guildId, 'utility');
    if (!isEnabled) return;

    // Fetch guild settings for language
    const settings = await GuildService.getSettings(tenantId, guildId);
    const lang = settings?.lang || 'en';
    const prefix = settings?.prefix || '!';

    // 1. Skip if it's a command
    if (message.content.startsWith(prefix)) return;

    // 2. Auto-Clear AFK (If the author was AFK)
    const authorAfk = await UtilityRepository.getAFK(tenantId, guildId, message.author.id);
    if (authorAfk) {
      await UtilityRepository.clearAFK(tenantId, guildId, message.author.id);
      
      const welcomeBack = await message.reply(ContainerService.simple(
        Translator.t('utility', 'afk.welcome_back', lang, { user: message.author.id }),
        { color: '#28C76F' }
      ));
      setTimeout(() => welcomeBack.delete().catch(() => {}), 5000);
    }

    // 3. Notify of Mentions (If mentioned users are AFK)
    if (message.mentions.users.size > 0) {
      message.mentions.users.forEach(async (user) => {
        if (user.id === message.author.id) return;
        
        const targetAfk = await UtilityRepository.getAFK(tenantId, guildId, user.id);
        if (targetAfk) {
          const timeAgo = `<t:${Math.floor(targetAfk.createdAt.getTime() / 1000)}:R>`;
          
          await message.reply({
            ...ContainerService.create({
              title: `${user.username} is AFK`,
              description: Translator.t('utility', 'afk.notify', lang, { 
                user: user.username, 
                reason: targetAfk.reason!, 
                time: timeAgo 
              }),
              thumbnail: user.displayAvatarURL(),
              color: '#FF9F43'
            }),
            allowedMentions: { users: [] }
          });
        }
      });
    }
  },
};
