import { AiModuleManifest, RiskLevel } from '../ai/types/AiManifest';
import { UtilityRepository } from './database/UtilityRepository';
import { prisma } from '../../database/client';
import fs from 'node:fs';
import path from 'node:path';

export const UtilityManifest: AiModuleManifest = {
  moduleName: 'Utility',
  actions: [
    {
      action: 'set_afk',
      description: 'Sets the speaking citizen as AFK with a specified reason.',
      risk: RiskLevel.LOW,
      parameters: {
        reason: { type: 'string', description: 'The reason for being AFK.', required: true }
      },
      handler: async (params, context) => {
        const { interaction, tenantId, guildId } = context;
        await UtilityRepository.setAFK(tenantId, guildId, interaction.user.id, params.reason);
        return { executed: true, result: `I have marked you as AFK. Reason: "${params.reason}". I will notify others when they mention you.` };
      }
    },
    {
      action: 'clear_afk',
      description: 'Removes the AFK status for the speaking citizen.',
      risk: RiskLevel.LOW,
      parameters: {},
      handler: async (params, context) => {
        const { interaction, tenantId, guildId } = context;
        await UtilityRepository.clearAFK(tenantId, guildId, interaction.user.id);
        return { executed: true, result: 'Welcome back. I have removed your AFK status.' };
      }
    },
    {
      action: 'view_afk',
      description: 'Checks if a citizen is currently AFK. Defaults to the speaking citizen.',
      risk: RiskLevel.LOW,
      parameters: {
        userId: { type: 'string', description: 'The user ID to check (defaults to requester).', required: false }
      },
      handler: async (params, context) => {
        const { interaction, tenantId, guildId } = context;
        const targetId = params.userId || interaction.user.id;
        const afk = await UtilityRepository.getAFK(tenantId, guildId, targetId);
        
        if (!afk) return { executed: true, result: `<@${targetId}> is not currently AFK.` };
        
        const duration = Math.floor((Date.now() - afk.createdAt.getTime()) / 60000);
        return { executed: true, result: `<@${targetId}> is currently AFK: "${afk.reason}" (Set ${duration} minutes ago).` };
      }
    },
    {
      action: 'set_timezone',
      description: 'Sets the timezone for the speaking citizen.',
      risk: RiskLevel.LOW,
      parameters: {
        timezone: { type: 'string', description: 'The timezone to set (e.g. "Europe/London", "America/New_York", "UTC").', required: true }
      },
      handler: async (params, context) => {
        const { interaction, tenantId } = context;
        const zone = params.timezone;

        try {
          Intl.DateTimeFormat(undefined, { timeZone: zone });
        } catch (e) {
          return { executed: false, result: `The timezone "${zone}" is invalid. Please use a standard IANA format like "Europe/London".` };
        }

        await prisma.user_timezones.upsert({
          where: { userId_tenantId: { userId: interaction.user.id, tenantId } },
          update: { timezone: zone, updatedAt: new Date() },
          create: { userId: interaction.user.id, tenantId, timezone: zone, updatedAt: new Date() }
        });

        return { executed: true, result: `I have updated your internal clock. Your timezone is now set to **${zone}**.` };
      }
    },
    {
      action: 'view_timezone',
      description: 'Views the timezone and current local time of a citizen. Defaults to the speaking citizen.',
      risk: RiskLevel.LOW,
      parameters: {
        userId: { type: 'string', description: 'The user ID to check (defaults to requester).', required: false }
      },
      handler: async (params, context) => {
        const { interaction, tenantId } = context;
        const targetId = params.userId || interaction.user.id;
        
        const userTz = await prisma.user_timezones.findUnique({
          where: { userId_tenantId: { userId: targetId, tenantId } }
        });

        if (!userTz) return { executed: true, result: `<@${targetId}> has not registered their timezone with me.` };

        const now = new Date();
        const formatter = new Intl.DateTimeFormat('en-US', {
          timeZone: userTz.timezone,
          hour: '2-digit', minute: '2-digit', hour12: true,
          weekday: 'long', month: 'long', day: 'numeric'
        });

        return { executed: true, result: `🌍 <@${targetId}>'s Zone: **${userTz.timezone}**\n⏰ Local Time: **${formatter.format(now)}**` };
      }
    }
  ]
};
