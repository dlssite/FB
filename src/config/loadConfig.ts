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

/**
 * Dynamically load bot-specific config
 */
export function loadFlamebornConfig(): FlamebornConfig {
  const botName = process.env.FLAMEBORN_CONFIG || 'ember';
  
  console.log(`🔧 Loading Flameborn config for: "${botName}"`);

  try {
    // Dynamically require the config file
    const config = require(`./instances/flameborn.${botName}`).default || 
                   require(`./instances/flameborn.${botName}`).flamebornConfig ||
                   require(`./instances/flameborn.${botName}`);
    
    console.log(`✅ Loaded config for bot: "${botName}"`);
    return config;
  } catch (err: any) {
    console.error(`❌ Failed to load config for bot "${botName}": ${err.message}`);
    console.error(`Available bots: ember, kai, saphy, liber`);
    console.error(`Expected file: src/config/instances/flameborn.${botName}.ts`);
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
