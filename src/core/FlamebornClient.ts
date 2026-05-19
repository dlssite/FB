import { Client, Collection, GatewayIntentBits, Partials } from 'discord.js';

export class FlamebornClient extends Client {
  public commands: Collection<string, any>;
  public aliases: Collection<string, string>;

  constructor() {
    super({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers, // Required for join/leave events
        GatewayIntentBits.GuildInvites, // Required for invite tracking
        GatewayIntentBits.GuildVoiceStates, // Required for TempVoice triggers
        GatewayIntentBits.DirectMessages, // REQUIRED for receiving direct messages in DMs (Modmail)
      ],
      partials: [
        Partials.Channel, // REQUIRED to trigger events on non-cached DM channels
        Partials.Message,
      ],
    });
    this.commands = new Collection();
    this.aliases = new Collection();
    this.setMaxListeners(100); // Modular architecture requires more listeners than default 10
  }
}

export const client = new FlamebornClient();
