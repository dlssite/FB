import { prisma } from '../database/client';
import { AddonService } from '../services/AddonService';
import { flamebornConfig } from '../config/flameborn.config';

/**
 * Generate MODULE_CONFIG dynamically from bot config
 * This ensures autocomplete shows only actual modules defined in the bot config
 */
function generateModuleConfig() {
  const config: Record<string, { label: string }> = {};
  const modules = flamebornConfig.modules || {};
  
  for (const [key, module] of Object.entries(modules)) {
    if (module && typeof module === 'object' && 'emoji' in module && 'name' in module) {
      config[key] = { label: `${module.emoji} ${module.name}` };
    }
  }
  
  return config;
}

const MODULE_CONFIG = generateModuleConfig();

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
