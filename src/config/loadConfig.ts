/**
 * ======================================================
 * 🔧 Flameborn Multi-Instance Config Loader
 * ======================================================
 * Loads the appropriate Flameborn configuration based on
 * the FLAMEBORN_CONFIG environment variable.
 * 
 * Usage:
 *   FLAMEBORN_CONFIG=ember npm start
 *   FLAMEBORN_CONFIG=kai npm start
 *   FLAMEBORN_CONFIG=saphy npm start
 *   FLAMEBORN_CONFIG=liber npm start
 */

import { FlamebornConfig } from './flameborn.config';
import emberConfig from './instances/flameborn.ember';
import kaiConfig from './instances/flameborn.kai';
import saphyConfig from './instances/flameborn.saphy';
import liberConfig from './instances/flameborn.liber';

const configMap: Record<string, FlamebornConfig> = {
  ember: emberConfig,
  kai: kaiConfig,
  saphy: saphyConfig,
  liber: liberConfig,
};

/**
 * Dynamically load bot-specific config
 */
export function loadFlamebornConfig(): FlamebornConfig {
  const botName = process.env.FLAMEBORN_CONFIG || 'ember';
  
  console.log(`🔧 Loading Flameborn config for: "${botName}"`);

  try {
    const config = configMap[botName];
    if (!config) {
      throw new Error(`Unknown bot: ${botName}`);
    }
    
    console.log(`✅ Loaded config for bot: "${botName}"`);
    return config;
  } catch (err: any) {
    console.error(`❌ Failed to load config for bot "${botName}": ${err.message}`);
    console.error(`Available bots: ember, kai, saphy, liber`);
    process.exit(1);
  }
}

/**
 * Get bot name from environment
 */
export function getBotName(): string {
  return process.env.FLAMEBORN_CONFIG || 'ember';
}

/**
 * Get corresponding .env file path
 */
export function getEnvPath(): string {
  const botName = process.env.FLAMEBORN_CONFIG || 'ember';
  return `env/${botName}.env`;
}
