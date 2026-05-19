import { Shoukaku, Connectors } from 'shoukaku';
import { flamebornConfig } from '../../../config/flameborn.config';
import { Logger } from '../../../utils/logger';

// Use globalThis to persist the instance across module reloads/multiple imports
const globalLava = globalThis as any;
if (!globalLava.__shoukaku) globalLava.__shoukaku = null;

/**
 * Initializes the Shoukaku (Lavalink) connection.
 * Call this once the Discord client is ready.
 */
export function initLavalink(client: any): Shoukaku {
  if (globalLava.__shoukaku) return globalLava.__shoukaku;

  if (!client.user?.id) return null as any;

  // Log summary of healthy nodes after 10 seconds (gives nodes time to handshake)
  setTimeout(() => {
    const nodesArray = Array.from(globalLava.__shoukaku?.nodes.values() || []);
    const healthy = nodesArray.filter((n: any) => n.state === 1 || n.state === 'CONNECTED').length;
    Logger.loader(`[SYMPHONY] Lavalink cluster status: ${healthy}/${nodesArray.length} nodes online.`);
  }, 10000);

  const NODES = flamebornConfig.music.nodes.map(node => ({
    name: node.name,
    url: node.url,
    auth: node.auth,
    secure: node.secure,
  }));

  globalLava.__shoukaku = new Shoukaku(new Connectors.DiscordJS(client), [], {
    resume: true,
    resumeTimeout: 30,
    reconnectTries: 5,
    reconnectInterval: 10,
    restTimeout: 60,
  });

  // Manually force the ID onto the manager to resolve Connector resolution issues
  globalLava.__shoukaku.id = client.user.id;

  // Manually add nodes to ensure they register after the ID is set
  for (const node of NODES) {
    try {
      globalLava.__shoukaku.addNode(node);
    } catch (e) {}
  }

  globalLava.__shoukaku.on('ready', (name: string) => Logger.loader(`[Lavalink] Node "${name}" connected.`));
  globalLava.__shoukaku.on('error', (name: string, err: any) => Logger.error(`[Lavalink] Node "${name}" error: ${err.message}`));
  
  globalLava.__shoukaku.on('debug', (name: string, info: string) => {
    if (info.toLowerCase().includes('fail') || info.toLowerCase().includes('error')) {
      Logger.warn(`[Lavalink-Debug] [${name}] ${info}`);
    }
  });

  globalLava.__shoukaku.on('disconnect', (name: string, count: number) =>
    Logger.warn(`[Lavalink] Node "${name}" disconnected. Moved ${count} players to backup nodes.`)
  );

  return globalLava.__shoukaku;
}

/**
 * Returns the active Shoukaku instance.
 */
export function getLavalink(): Shoukaku | null {
  return globalLava.__shoukaku;
}

/**
 * Creates or retrieves a Lavalink player for a guild.
 */
export async function getOrCreatePlayer(client: any, guildId: string, channelId: string, textChannelId: string) {
  // Wait up to 5 seconds for initialization if called too early
  let attempts = 0;
  while (!globalLava.__shoukaku && attempts < 10) {
    await new Promise(r => setTimeout(r, 500));
    attempts++;
  }

  const lava = getLavalink();
  if (!lava) throw new Error('[Lavalink] Not initialized after 5s wait. Please try again in a moment.');

  let player = lava.players.get(guildId);

  if (!player) {
    const shardId = (client as any).guilds.cache.get(guildId)?.shardId || 0;
    player = await lava.joinVoiceChannel({
      guildId,
      channelId,
      shardId,
      deaf: true
    });
  }

  return player;
}

/**
 * Searches for a track by query on Lavalink using the best available node.
 */
export async function searchTrack(query: string): Promise<any | null> {
  const lava = getLavalink();
  if (!lava) return null;

  // Get ideal node from Shoukaku's active nodes
  const node = lava.getIdealNode();
  if (!node) return null;

  const isUrl = query.startsWith('http://') || query.startsWith('https://');
  const searchQuery = isUrl ? query : `ytsearch:${query}`;

  const result = await node.rest.resolve(searchQuery).catch(() => null);
  if (!result) return null;

  // Handle Shoukaku v4 response format
  if (!result || !result.data) return null;

  const { loadType, data } = result as any;

  if (loadType === 'track') return data;
  if (loadType === 'search' && Array.isArray(data) && data.length > 0) return data[0];
  if (loadType === 'playlist' && data.tracks?.length > 0) return data.tracks[0];
  
  return null;
}
