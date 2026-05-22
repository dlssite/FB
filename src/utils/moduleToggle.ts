import { prisma } from '../database/client';
import { AddonService } from '../services/AddonService';

/**
 * Module configuration definitions
 */
const MODULE_CONFIG = {
  activity: { label: '📊 Activity' },
  ai: { label: '🤖 AI' },
  auto: { label: '⚡ Auto React' },
  automod: { label: '🛡️ AutoMod' },
  autoreply: { label: '💬 Auto Reply' },
  birthday: { label: '🎂 Birthday' },
  booster: { label: '⭐ Booster' },
  counting: { label: '🔢 Counting' },
  economy: { label: '💰 Economy' },
  faction: { label: '⚔️ Factions' },
  fun: { label: '🎮 Fun' },
  giveaway: { label: '🎁 Giveaway' },
  invite: { label: '📨 Invites' },
  leveling: { label: '📈 Leveling' },
  logging: { label: '📝 Logging' },
  marriage: { label: '💍 Marriage' },
  minecraft: { label: '⛏️ Minecraft' },
  moderation: { label: '🚨 Moderation' },
  modmail: { label: '📬 Modmail' },
  music: { label: '🎵 Music' },
  nsfw: { label: '🔞 NSFW' },
  pet: { label: '🐾 Pets' },
  profile: { label: '👤 Profile' },
  quotes: { label: '💭 Quotes' },
  reactionRole: { label: '🏷️ Reaction Roles' },
  shop: { label: '🛍️ Shop' },
  social: { label: '📢 Social Alerts' },
  streaks: { label: '🔥 Streaks' },
  suggestion: { label: '💡 Suggestions' },
  tempvoice: { label: '🎙️ Temp Voice' },
  territory: { label: '🗺️ Territory' },
  ticket: { label: '🎫 Tickets' },
  transport: { label: '🚀 Transport' },
  truthOrDare: { label: '🎯 Truth or Dare' },
  utility: { label: '🔧 Utility' },
  verification: { label: '✅ Verification' },
  voice: { label: '🔊 Voice' },
  welcomer: { label: '👋 Welcomer' },
  whitelist: { label: '🚪 Whitelist' },
};

export type ModuleKey = keyof typeof MODULE_CONFIG;

/**
 * Get all available modules with their status using AddonService
 */
export async function getModuleConfig(tenantId: string, guildId: string) {
  const modules: Record<string, { enabled: boolean; label: string; reason?: string }> = {};

  for (const key of Object.keys(MODULE_CONFIG) as ModuleKey[]) {
    const status = await AddonService.checkStatus(tenantId, guildId, key);
    modules[key] = {
      enabled: status.enabled,
      label: MODULE_CONFIG[key].label,
      reason: status.reason
    };
  }

  return modules;
}

/**
 * Toggle a module on/off by updating disabledAddons array
 */
export async function toggleModule(
  tenantId: string,
  guildId: string,
  moduleKey: ModuleKey,
  enabled: boolean
) {
  const settings = await prisma.server_settings.findUnique({
    where: { guildId_tenantId: { guildId, tenantId } }
  });

  let disabledAddons: string[] = [];
  if (settings && settings.disabledAddons) {
    disabledAddons = Array.isArray(settings.disabledAddons)
      ? settings.disabledAddons
      : JSON.parse(settings.disabledAddons as any);
  }

  // Update the disabled list
  if (enabled) {
    // Remove from disabled list
    disabledAddons = disabledAddons.filter(m => m !== moduleKey.toLowerCase());
  } else {
    // Add to disabled list if not already there
    if (!disabledAddons.includes(moduleKey.toLowerCase())) {
      disabledAddons.push(moduleKey.toLowerCase());
    }
  }

  await prisma.server_settings.upsert({
    where: { guildId_tenantId: { guildId, tenantId } },
    update: { disabledAddons: JSON.stringify(disabledAddons) },
    create: {
      guildId,
      tenantId,
      disabledAddons: JSON.stringify(disabledAddons)
    }
  });
}

/**
 * Check if a module is enabled (uses full AddonService layer check)
 */
export async function isModuleEnabled(
  tenantId: string,
  guildId: string,
  moduleKey: ModuleKey
): Promise<boolean> {
  return AddonService.isEnabled(tenantId, guildId, moduleKey);
}

/**
 * Get module label
 */
export function getModuleLabel(moduleKey: ModuleKey): string {
  return MODULE_CONFIG[moduleKey]?.label || moduleKey;
}

/**
 * Get all module keys
 */
export function getAllModules(): ModuleKey[] {
  return Object.keys(MODULE_CONFIG) as ModuleKey[];
}
