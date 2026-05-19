import { Events, IntentsBitField } from 'discord.js';
import { FlamebornClient } from '../../../core/FlamebornClient';
import { Logger } from '../../../utils/logger';

export default {
  name: Events.ClientReady,
  once: true,
  execute(client: FlamebornClient) {
    Logger.success(`Discord connection established! Logged in as ${client.user?.tag}`);
    
    // Log Active Intents for diagnostic purposes
    const intents = new IntentsBitField(client.options.intents as any);
    Logger.info(`Active Gateway Intents: ${intents.toArray().join(', ')}`, 'SYSTEM' as any);
    
    // Register commands globally
    const commandsArray = client.commands.map(cmd => cmd.data.toJSON());
    client.application?.commands.set(commandsArray)
      .then(async () => {
        Logger.success(`Successfully registered ${commandsArray.length} slash commands.`);
        
        // Cleanup phantom guild commands
        let cleared = 0;
        for (const guild of client.guilds.cache.values()) {
          try {
            await guild.commands.set([]);
            cleared++;
          } catch (err) {
            // Ignore missing access errors
          }
        }
        Logger.success(`Wiped leftover local commands from ${cleared} guilds to prevent duplicates.`);
      })
      .catch(err => Logger.error('Failed to register slash commands', err));
  },
};
