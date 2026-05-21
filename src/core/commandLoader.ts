import fs from 'fs';
import path from 'path';
import { MessageFlags } from 'discord.js';
import { FlamebornClient } from './FlamebornClient';
import { pathToFileURL, fileURLToPath } from 'url';
import { Logger } from '../utils/logger';
import { flamebornConfig } from '../config/flameborn.config';
import { findFileWithFallback, importModule } from '../utils/fileLoader';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Deduplication guard: prevents two event listener instances from both
// responding to the same autocomplete interaction token (race condition).
const _handledAutocompleteIds = new Set<string>();

export async function loadCommands(client: FlamebornClient) {
  Logger.loader('Bootstrapping application commands...');
  const modulesPath = path.join(__dirname, '../modules');
  if (!fs.existsSync(modulesPath)) return;

  const moduleDirs = fs.readdirSync(modulesPath);

  for (const moduleDir of moduleDirs) {
    const config = (flamebornConfig.modules as any)[moduleDir];
    
    // Static Module Check (Layer 0)
    if (config && config.active === false) {
      Logger.loader(`[${moduleDir.toUpperCase()}] 💤 Module is disabled in config. Skipping.`);
      continue;
    }

    const modulePath = path.join(modulesPath, moduleDir);
    const commandsPath = path.join(modulePath, 'commands');
    const aliasesPath = findFileWithFallback(modulePath, 'aliases');

    // 1. Load Aliases if they exist
    if (aliasesPath) {
      try {
        const aliasModule = await importModule(aliasesPath);
        const aliases = Object.values(aliasModule)[0] as Record<string, string>;
        if (aliases) {
          for (const [alias, command] of Object.entries(aliases)) {
            client.aliases.set(alias, command);
          }
          Logger.loader(`[${moduleDir.toUpperCase()}] 🔗 Registered ${Object.keys(aliases).length} aliases.`);
        }
      } catch (err) {
        Logger.error(`Failed to load aliases for ${moduleDir}`, err);
      }
    }

    // 2. Load Commands
    if (fs.existsSync(commandsPath)) {
      const count = await loadFromDirectory(commandsPath, client, moduleDir);
      if (count > 0) {
        Logger.loader(`[${moduleDir.toUpperCase()}] ⚡ Loaded ${count} commands.`);
      }
    }
  }

  Logger.loader(`Successfully initialized ${client.commands.size} Global Commands.`);
}

async function loadFromDirectory(dir: string, client: FlamebornClient, moduleName: string): Promise<number> {
  const files = fs.readdirSync(dir, { withFileTypes: true });
  let count = 0;

  // 1. Check for Master Command (_command.ts)
  const masterFile = files.find(f => f.name === '_command.ts' || f.name === '_command.js');
  
  if (masterFile) {
    const masterPath = path.join(dir, masterFile.name);
    const masterModule = await import(pathToFileURL(masterPath).href);
    const masterCommand = masterModule.default || masterModule;

    // 2. Load all other files as subcommands
    if (!masterCommand.subcommands) masterCommand.subcommands = new Map();

    for (const file of files) {
      if (file.name === masterFile.name || file.isDirectory()) continue;
      if (!file.name.endsWith('.ts') && !file.name.endsWith('.js')) continue;

      const subPath = path.join(dir, file.name);
      const subModule = await import(pathToFileURL(subPath).href);
      const subCommand = subModule.default || subModule;
      const subName = file.name.replace(/\.[^/.]+$/, "");

      if (typeof subCommand.data === 'function') {
        const { SlashCommandSubcommandBuilder, SlashCommandSubcommandGroupBuilder } = await import('discord.js');
        
        // Try Subcommand first, if it fails or if we want to support groups:
        // We can check the subCommand.isGroup flag or similar.
        let builder;
        if (subCommand.isGroup) {
          builder = subCommand.data(new SlashCommandSubcommandGroupBuilder());
          masterCommand.data.addSubcommandGroup(builder);
        } else {
          builder = subCommand.data(new SlashCommandSubcommandBuilder());
          masterCommand.data.addSubcommand(builder);
        }
      } else if (subCommand.data) {
        masterCommand.data.addSubcommand(subCommand.data);
      }
      
      masterCommand.subcommands.set(subName, subCommand);
    }

    // Wrap the master execute to route to subcommands
    const originalExecute = masterCommand.execute;
    masterCommand.execute = async (interaction: any, client: any) => {
      const groupName = interaction.options.getSubcommandGroup(false);
      const subName = interaction.options.getSubcommand();
      const lookup = groupName || subName;
      
      const sub = masterCommand.subcommands.get(lookup);
      if (sub) return await sub.execute(interaction, client);
      if (originalExecute) return await originalExecute(interaction, client);
    };

    masterCommand.autocomplete = async (interaction: any, client: any) => {
      // ── Deduplication Guard ──────────────────────────────────────────
      // Discord sends one autocomplete event, but if two bot processes
      // share the same token they both receive it. Only the first one to
      // claim the interaction ID should respond; the rest are dropped.
      const interactionId: string = interaction.id;
      if (_handledAutocompleteIds.has(interactionId)) {
        Logger.warn(`[Autocomplete] Duplicate interaction ${interactionId} dropped.`);
        return;
      }
      _handledAutocompleteIds.add(interactionId);
      // Auto-purge after 3 s so the Set never grows unbounded.
      setTimeout(() => _handledAutocompleteIds.delete(interactionId), 3000);
      // ────────────────────────────────────────────────────────────────

      try {
        const subName = interaction.options.getSubcommand();
        Logger.info(`[Autocomplete] Master command autocomplete triggered for subcommand: ${subName}`);
        const sub = masterCommand.subcommands.get(subName);
        if (!sub) {
          Logger.warn(`[Autocomplete] Subcommand '${subName}' not found in subcommands registry.`);
          return;
        }
        if (!sub.autocomplete) {
          Logger.warn(`[Autocomplete] Subcommand '${subName}' does not have an autocomplete method.`);
          return;
        }
        Logger.info(`[Autocomplete] Routing autocomplete to subcommand '${subName}'`);
        return await sub.autocomplete(interaction, client);
      } catch (err) {
        Logger.error('[Autocomplete] Error in master autocomplete routing:', err);
      }
    };

    masterCommand.module = moduleName;
    client.commands.set(masterCommand.data.name, masterCommand);
    return 1; // Only 1 top-level command registered!
  }

  // Fallback to individual commands if no _command.ts is present
  for (const file of files) {
    const filePath = path.join(dir, file.name);
    if (file.isDirectory()) {
      count += await loadFromDirectory(filePath, client, moduleName);
    } else if (file.name.endsWith('.ts') || file.name.endsWith('.js')) {
      try {
        const commandModule = await import(pathToFileURL(filePath).href);
        const command = commandModule.default || commandModule;
        if ('data' in command && 'execute' in command) {
          command.module = moduleName;
          client.commands.set(command.data.name, command);
          count++;
        }
      } catch (error) {
        Logger.error(`Failed to load command at ${file.name}`, error);
      }
    }
  }
  return count;
}
