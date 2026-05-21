import { Events, Message, GuildMember, TextChannel, Role, Channel } from 'discord.js';
import { GuildService } from '../../../services/GuildService';
import { TenantRepository } from '../../../repositories/TenantRepository';
import { tenantStorage } from '../../../utils/context';
import { FlamebornClient } from '../../../core/FlamebornClient';
import { EmbedService } from '../../../utils/embed';
import { AddonService } from '../../../services/AddonService';
import { RoutingService } from '../../../services/RoutingService';
import { replyV2 } from '../../../utils/container';

export default {
  name: Events.MessageCreate,
  once: false,
  async execute(message: Message, client: FlamebornClient) {
    if (message.author.bot || !message.guild) return;

    // 1. Resolve Tenant & Prefix
    const tenantId = await TenantRepository.getTenantForGuild(message.guild.id) || process.env.TENANT_ID || 'tenant_alpha_01';
    const settings = await GuildService.getSettings(tenantId, message.guild.id);
    const prefix = settings?.prefix || '!';

    console.log(`[PREFIX_DEBUG] Guild: ${message.guild.id}, Prefix from DB: "${prefix}", Message starts with: "${message.content.substring(0, 5)}"`);
    if (!message.content.startsWith(prefix)) return;

    const rawArgs = message.content.slice(prefix.length).trim().split(/ +/);
    const trigger = rawArgs.shift()?.toLowerCase();
    if (!trigger) return;

    // Smart Date Expansion: Convert 23-02-2002 or 23/02 into separate args ['23', '02', '2002']
    const args: string[] = [];
    for (const arg of rawArgs) {
      if (/^\d{1,2}[/-]\d{1,2}([/-]\d{2,4})?$/.test(arg)) {
        args.push(...arg.split(/[/-]/));
      } else {
        args.push(arg);
      }
    }

    // 2. Resolve Alias & Command (Support master:group:sub format)
    const fullCommandName = client.aliases.get(trigger) || trigger;
    const [mainName, groupOrSubName, leafSubName] = fullCommandName.split(':');
    
    const command = client.commands.get(mainName);
    if (!command) return;

    // 3. Resolve Module-specific Tenant (Respects Matrix Overrides)
    const moduleTenantId = await RoutingService.resolveTenantId(message.guild.id, command.module);

    // 4. Module Status Check
    const isSystemAction = (command.module === 'leveling' && (trigger === 'leveltoggle' || trigger === 'levelset'));
    
    if (!isSystemAction) {
      const status = await AddonService.checkStatus(moduleTenantId, message.guild.id, command.module);
      if (!status.enabled) {
        const errorMsg = status.reason === 'MOTHER'
          ? `❌ The **${command.module.toUpperCase()}** module is currently disabled by Mother.`
          : `❌ The **${command.module.toUpperCase()}** module is currently disabled by a server administrator.`;
        return await message.reply({ content: errorMsg });
      }
    }

    // 4. Permission Check
    if (command.data.default_member_permissions) {
      if (!message.member?.permissions.has(BigInt(command.data.default_member_permissions))) {
        return message.reply({ embeds: [EmbedService.error('You do not have permission to use this command.')] });
      }
    }

    // 5. Senior Interaction Shim (Subcommand Aware)
    try {
      await tenantStorage.run({ tenantId: moduleTenantId, guildId: message.guild.id, lang: settings?.lang || 'en' }, async () => {
        let argIndex = 0;
        const shimInteraction: any = {
          client,
          guildId: message.guildId,
          guild: message.guild,
          channel: message.channel,
          user: message.author,
          member: message.member,
          memberPermissions: message.member?.permissions,
          message,
          deferred: false,
          replied: false,
          replyMessage: null,
          typingInterval: null as any,
          isChatInputCommand: () => true,
          deferReply: async (options?: { ephemeral?: boolean }) => { 
            shimInteraction.deferred = true;
            // Send initial typing indicator
            await (message.channel as any).sendTyping().catch(() => {});
            // Keep typing active every 4 seconds until replied
            if (!shimInteraction.typingInterval) {
              shimInteraction.typingInterval = setInterval(() => {
                (message.channel as any).sendTyping().catch(() => {});
              }, 4000);
            }
            return null;
          },
          reply: async (payload: any) => {
            if (shimInteraction.typingInterval) {
              clearInterval(shimInteraction.typingInterval);
              shimInteraction.typingInterval = null;
            }
            shimInteraction.replied = true;
            if (payload && payload.components && payload.components.some((c: any) => c.constructor?.name === 'ContainerBuilder' || c.type === 23)) {
              await replyV2(shimInteraction, payload);
              return shimInteraction.replyMessage;
            }
            if (shimInteraction.replyMessage) return await (shimInteraction.replyMessage as any).edit(payload);
            shimInteraction.replyMessage = await message.reply(payload);
            return shimInteraction.replyMessage;
          },
          editReply: async (payload: any) => {
            if (shimInteraction.typingInterval) {
              clearInterval(shimInteraction.typingInterval);
              shimInteraction.typingInterval = null;
            }
            shimInteraction.replied = true;
            if (payload && payload.components && payload.components.some((c: any) => c.constructor?.name === 'ContainerBuilder' || c.type === 23)) {
              await replyV2(shimInteraction, payload);
              return shimInteraction.replyMessage;
            }
            if (shimInteraction.replyMessage) return await (shimInteraction.replyMessage as any).edit(payload);
            shimInteraction.replyMessage = await message.reply(payload);
            return shimInteraction.replyMessage;
          },
          fetchReply: async () => {
            if (shimInteraction.replyMessage) {
              // Ensure it's a full Discord.js Message instance if it's a raw object
              if (typeof shimInteraction.replyMessage.fetch !== 'function' && shimInteraction.replyMessage.id) {
                const msg = await message.channel.messages.fetch(shimInteraction.replyMessage.id).catch(() => null);
                if (msg) shimInteraction.replyMessage = msg;
              }
              return shimInteraction.replyMessage;
            }
            return null;
          },
          followUp: async (payload: any) => {
            if (shimInteraction.typingInterval) {
              clearInterval(shimInteraction.typingInterval);
              shimInteraction.typingInterval = null;
            }
            if (payload && payload.components && payload.components.some((c: any) => c.constructor?.name === 'ContainerBuilder' || c.type === 23)) {
              await replyV2(shimInteraction, payload);
              return shimInteraction.replyMessage;
            }
            return await message.reply(payload);
          },
          options: {
            getSubcommand: () => leafSubName || groupOrSubName || null,
            getSubcommandGroup: () => leafSubName ? groupOrSubName : null,
            getString: (name: string, required?: boolean) => {
              if (name === 'reason') {
                const val = args.slice(argIndex).join(' ');
                argIndex = args.length;
                return val || null;
              }
              const val = args[argIndex++];
              if (!val && required) throw new Error(`Missing required option: \`${name}\``);
              return val || null;
            },
            getUser: (name: string, required?: boolean) => {
              const val = args[argIndex++];
              if (!val && required) throw new Error(`Missing required option: \`${name}\``);
              const mention = message.mentions.users.first();
              if (mention && val?.includes(mention.id)) return mention;
              return val ? client.users.cache.get(val.replace(/[<@!>]/g, '')) : null;
            },
            getMember: (name: string, required?: boolean) => {
              const val = args[argIndex++];
              if (!val && required) throw new Error(`Missing required option: \`${name}\``);
              const mention = message.mentions.members?.first();
              if (mention && val?.includes(mention.id)) return mention;
              return val ? message.guild?.members.cache.get(val.replace(/[<@!>]/g, '')) : null;
            },
            getBoolean: (name: string, required?: boolean) => {
              const val = args[argIndex++];
              if (!val && required) throw new Error(`Missing required option: \`${name}\``);
              if (!val) return null;
              return ['true', 'on', 'yes'].includes(val.toLowerCase());
            },
            getInteger: (name: string, required?: boolean) => {
              const val = args[argIndex++];
              if (!val && required) throw new Error(`Missing required option: \`${name}\``);
              return val ? parseInt(val) : null;
            },
            getRole: (name: string, required?: boolean) => {
              const val = args[argIndex++];
              if (!val && required) throw new Error(`Missing required option: \`${name}\``);
              const mention = message.mentions.roles.first();
              if (mention && val?.includes(mention.id)) return mention;
              return val ? message.guild?.roles.cache.get(val.replace(/[<@&>]/g, '')) : null;
            },
            getChannel: (name: string, required?: boolean) => {
              const val = args[argIndex++];
              if (!val && required) throw new Error(`Missing required option: \`${name}\``);
              const mention = message.mentions.channels.first();
              if (mention && val?.includes(mention.id)) return mention;
              return val ? message.guild?.channels.cache.get(val.replace(/[<@#>]/g, '')) : null;
            },
          },
          _leafSubName: leafSubName || null
        };

        try {
          await command.execute(shimInteraction, client);
        } finally {
          if (shimInteraction.typingInterval) {
            clearInterval(shimInteraction.typingInterval);
            shimInteraction.typingInterval = null;
          }
        }
      });
    } catch (error: any) {
      console.error(`[PrefixError] ${trigger}:`, error);
      const errorEmbed = EmbedService.error(`Execution Error: ${error.message}`);
      await message.reply({ embeds: [errorEmbed] }).catch(() => {});
    }
  },
};
