/**
 * ======================================================
 * Global Config Provider
 * ======================================================
 * Provides the currently loaded config instance to all
 * services that need it. This is set during bootstrap.
 */

import { FlamebornConfig } from './flameborn.config';

let configInstance: FlamebornConfig | null = null;

/**
 * Set the active config instance (called during bootstrap)
 */
export function setFlamebornConfig(config: FlamebornConfig): void {
  configInstance = config;
}

/**
 * Get the active config instance
 */
export function getFlamebornConfig(): FlamebornConfig {
  if (!configInstance) {
    throw new Error('Flameborn config not initialized. Call setFlamebornConfig during bootstrap.');
  }
  return configInstance;
}

/**
 * Get a module's configuration by name
 */
export function getModuleConfig(moduleName: string) {
  const config = getFlamebornConfig();
  return (config.modules as any)[moduleName.toLowerCase()];
}
