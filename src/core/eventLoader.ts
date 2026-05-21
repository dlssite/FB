import fs from 'fs';
import path from 'path';
import { FlamebornClient } from './FlamebornClient';
import { pathToFileURL, fileURLToPath } from 'url';
import { Logger } from '../utils/logger';
import { flamebornConfig } from '../config/flameborn.config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function loadEvents(client: FlamebornClient) {
  Logger.loader('Initializing event listeners...');
  const modulesPath = path.join(__dirname, '../modules');
  if (!fs.existsSync(modulesPath)) return;

  const moduleDirs = fs.readdirSync(modulesPath);

  for (const moduleDir of moduleDirs) {
    const config = (flamebornConfig.modules as any)[moduleDir];

    // Static Module Check (Layer 0)
    if (config && config.active === false) {
      continue; // Silently skip for events to reduce noise, commands are already logged
    }

    const modulePath = path.join(modulesPath, moduleDir);
    const eventsPath = path.join(modulePath, 'events');

    if (fs.existsSync(eventsPath)) {
      const count = await loadFromDirectory(eventsPath, client, moduleDir);
      if (count > 0) {
        Logger.loader(`[${moduleDir.toUpperCase()}] ⚡ Loaded ${count} events.`);
      }
    }
  }
}

async function loadFromDirectory(dir: string, client: FlamebornClient, moduleName: string): Promise<number> {
  const files = fs.readdirSync(dir, { withFileTypes: true });
  let count = 0;

  for (const file of files) {
    const filePath = path.join(dir, file.name);

    if (file.isDirectory()) {
      count += await loadFromDirectory(filePath, client, moduleName);
    } else if (file.name.endsWith('.ts') || file.name.endsWith('.js')) {
      try {
        const eventModule = await import(pathToFileURL(filePath).href);
        const event = eventModule.default || eventModule;

        if (!event.name || !event.execute) continue;

        if (event.once) {
          client.once(event.name, (...args) => event.execute(...args, client));
        } else {
          client.on(event.name, (...args) => event.execute(...args, client));
        }
        count++;
      } catch (error) {
        Logger.error(`Failed to load event at ${file.name}`, error);
      }
    }
  }
  return count;
}
