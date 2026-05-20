/**
 * FLAMEBORN: SAPHY CONFIGURATION
 * Bot: Saphy | Color: #9D4EDD (Purple) | Personality: Lively, artistic, music-focused
 * Environment: env/saphy.env | Database: flameborn_saphy
 */

import { FlamebornConfig } from './flameborn.config';

const baseConfig: FlamebornConfig = {
  bot: { id: process.env.FLAMEBORN_ID || 'Saphy', mothershipUrl: process.env.MOTHERSHIP_URL || 'http://localhost:3005', port: parseInt(process.env.PORT || '3000', 10), tenant: { id: process.env.TENANT_ID || 'saphy_01', name: process.env.TENANT_NAME || 'Saphy\'s Sanctum' } },
  database: { logging: ['error', 'warn'], useRedis: process.env.REDIS_ENABLED === 'true', redisUrl: process.env.REDIS_URL },
  owner: { ids: ['838092589344489532'], names: ['Eternal Queen'] },
  support: { server: 'https://dsc.gg/sanctyr', website: 'https://sanctyr.space' },
  legal: { acceptTOS: true, dataCollection: true },
  behavior: { ownerSkipCooldown: true, globalCooldown: 3, autoDefer: true, collectorTimeout: 300000 },
  thresholds: { maxWarns: 5, spamLimit: 7, duplicateWindow: 900000 },
  assets: {
    banner: 'https://placehold.co/800x300.png?text=Saphy+Sanctum',
    helpBanner: 'https://i.ibb.co/H8mRMWM/HELP-Banner.png',
    statsBanner: 'https://i.ibb.co/LhxLBjWh/Stats-Banner.png',
    profileBanner: 'https://i.ibb.co/VTR2w09t/Profile-Banner.png',
    errorBanner: 'https://i.ibb.co/8Dc0jKt6/Error-Banner.png',
    giveawayBanner: 'https://i.ibb.co/cX6CCNL8/Giveaway-Banner.png',
    modmailBanner: 'https://placehold.co/800x300.png?text=SUPPORT',
    verificationBanner: 'https://i.ibb.co/Wh7Lh0L/Verify-Banner.png',
    ticketBanner: 'https://i.ibb.co/9k739QCX/Ticket.png',
    errorIdFormat: 'SAPHY-{RANDOM}',
  },
  economy: { miningRoleId: '123456789012345678', minMineHours: 4, maxMineHours: 6, assets: { robBanner: 'https://i.ibb.co/Frf65LK/Crime.png', hackBanner: 'https://i.ibb.co/DDxnh6wP/BREACH.png', workBanner: 'https://i.ibb.co/ks8kn9yc/WORK.png', dailyBanner: 'https://i.ibb.co/W4dpnHPm/DAILY.png', profileBanner: 'https://i.ibb.co/TBbzWC94/PROFILE.png', marketBanner: 'https://i.ibb.co/3mKKQjbq/MARKET.png', successBanner: 'https://i.ibb.co/Z1vkBWtp/SUCCESS.png', failureBanner: 'https://i.ibb.co/tPhd2sDT/FAILED.png', cooldownBanner: 'https://i.ibb.co/1jTWbyD/COOL.png', bankBanner: 'https://i.ibb.co/fzdvkSXJ/BANK.png', careerBanner: 'https://i.ibb.co/TV5RDP9/CAREER.png', mineBanner: 'https://i.ibb.co/KjvQ5mLt/MINE.png', vaultBanners: { prism_ledger: 'https://i.ibb.co/JWy7TTQm/prism.png', obsidian_fortress: 'https://i.ibb.co/hRZb7vWq/Obsidian.png', nova_fusion: 'https://i.ibb.co/wFT3xt65/Nova.png', void_stitch: 'https://i.ibb.co/DDNdwZxT/Void.png', eternal_aegis: 'https://i.ibb.co/0RCHvWFT/Aegis.png' } } },
  leveling: { defaultXpMin: 15, defaultXpMax: 25, defaultCooldown: 60, curveMultiplier: 1.5, baseXp: 100, assets: { rankCardBg: 'https://placehold.co/934x282.png?text=SAPHY+CORE' } },
  modules: {
    core: { active: true, name: 'Core System', description: 'Essential bot functions.', emoji: '⚙️' },
    tempvoice: { active: true, name: 'TempVoice', description: 'Dynamic voice channels', emoji: '🎙️' },
    tickets: { active: true, name: 'Tickets', description: 'Support tickets', emoji: '🎫' },
    moderation: { active: true, name: 'Justice Suite', description: 'Moderation systems.', emoji: '⚖️' },
    utility: { active: true, name: 'Utility', description: 'Helpful tools.', emoji: '🛠️' },
    automod: { active: false, name: 'Iron Shield', description: 'Auto-protection.', emoji: '🛡️' },
    welcomer: { active: true, name: 'Welcomer', description: 'Welcome messages.', emoji: '👋' },
    territory: { active: true, name: 'Territory', description: 'World engine.', emoji: '🌍' },
    economy: { active: true, name: 'Economy', description: 'Economic system.', emoji: '💠' },
    leveling: { active: true, name: 'Leveling', description: 'XP system.', emoji: '🧬' },
    auto: { active: true, name: 'Auto Engine', description: 'Auto responses.', emoji: '🤖' },
    birthday: { active: true, name: 'Birthdays', description: 'Birthday system.', emoji: '🎂' },
    booster: { active: true, name: 'Boosters', description: 'Booster perks.', emoji: '🚀' },
    invite: { active: true, name: 'Invites', description: 'Invite tracking.', emoji: '📈' },
    giveaway: { active: true, name: 'Giveaways', description: 'Giveaways.', emoji: '🎁' },
    modmail: { active: true, name: 'Modmail', description: 'Mail system.', emoji: '📩' },
    verification: { active: true, name: 'Verification', description: 'Verification.', emoji: '🛡️' },
    transportation: { active: true, name: 'Transport', description: 'Transit system.', emoji: '🚀' },
    faction: { active: true, name: 'Factions', description: 'Faction wars.', emoji: '🛡️' },
    shop: { active: true, name: 'Shop', description: 'Marketplace.', emoji: '🏪' },
    quotes: { active: true, name: 'Quotes', description: 'Quote images.', emoji: '📜' },
    nsfw: { active: true, name: 'NSFW', description: 'NSFW content.', emoji: '🔞' },
    social: { active: true, name: 'Social', description: 'Social system.', emoji: '💝' },
    truth_or_dare: { active: true, name: 'T/D', description: 'Truth or Dare.', emoji: '🎭' },
    streaks: { active: true, name: 'Streaks', description: 'Daily streaks.', emoji: '🔥' },
    counting: { active: true, name: 'Counting', description: 'Count minigame.', emoji: '🔢' },
    music: { active: true, name: 'Music', description: 'Music player.', emoji: '🎶' },
    ai: { active: true, name: 'AI', description: 'AI engine.', emoji: '🧠' },
    profile: { active: true, name: 'Profile', description: 'User profiles.', emoji: '👤' },
    fun: { active: true, name: 'Fun', description: 'Fun games.', emoji: '🎉' },
    activity: { active: true, name: 'Activity', description: 'Analytics.', emoji: '📊' },
  },
  shop: { currency: 'embers', taxRate: 0.05, enableTrading: true, categories: ['garage', 'housing', 'crafting', 'consumables'], emojis: { garage: '🚗', housing: '🏡', crafting: '⚒️', consumables: '🧪', default: '📦' }, news: { enabled: true, channelId: '1372134440539324548', broadcastOnNewTemplate: true, broadcastOnBigSale: true, broadcastOnAuctionStart: true }, assets: { marketBanner: 'https://images.unsplash.com/photo-1519608487953-e999c86e7455' } },
  invite: { defaultFakeThresholdDays: 7, assets: { statsBanner: 'https://placehold.co/800x200.png?text=STATS', leaderboardBanner: 'https://placehold.co/800x200.png?text=BOARD' } },
  redis: { enabled: process.env.REDIS_ENABLED === 'true', url: process.env.REDIS_URL || 'redis://localhost:6379', options: { maxRetriesPerRequest: null, enableReadyCheck: true } },
  branding: { color: '#9D4EDD', footerText: 'Saphy - Flameborn', logoUrl: 'https://i.imgur.com/uG9XF2X.png' },
  tickets: { assets: { panelBanner: 'https://i.ibb.co/9k739QCX/Ticket.png', openBanner: 'https://i.ibb.co/jZDnkmj0/Open.png' } },
  nsfw: { assets: { banner: 'https://placehold.co/800x300.png?text=SAPHY+NSFW' } },
  tod: { assets: { panelBanner: 'https://i.ibb.co/9khNnBQX/Panel.png', lobbyBanner: 'https://i.ibb.co/bjnRGbWJ/Lobby.png', spinningBanner: 'https://i.ibb.co/V0C2HSYg/Spin.png', selectionBanner: 'https://i.ibb.co/QRfDfTM/Select.png' } },
  music: {
    nodes: [
      { name: 'Heaven-Cloud', url: '89.106.84.59:4000', auth: 'heavencloud.in', secure: false },
      { name: 'Ajie-Blogs', url: 'lava-v4.ajieblogs.eu.org:443', auth: 'https://dsc.gg/ajidevserver', secure: true },
      { name: 'FreeLava', url: 'freelava.ga:80', auth: 'freelava.ga', secure: false },
      { name: 'Jirayu-Net', url: 'lavalink.jirayu.net:13592', auth: 'youshallnotpass', secure: false },
      { name: 'Serenetia', url: 'lavalinkv4.serenetia.com:80', auth: 'https://seretia.link/discord', secure: false },
      { name: 'Trinium', url: 'lavalink.triniumhost.com:4333', auth: 'free', secure: false },
      { name: 'Kasawa', url: 'lava.kasawa.pro:2333', auth: 'youshallnotpass', secure: false }
    ],
    geniusToken: process.env.GENIUS_TOKEN || '',
    jukebox: { defaultCost: 100 },
    vibeCombo: { minMembers: 5, multiplier: 2 },
    goldenHour: { xpMultiplier: 3, durationSeconds: 3600 },
  },
  ai: {
    maxContextTokens: 4000,
    defaultPersonaName: 'saphyran',
    defaultPersona: `You are Saphyran, a vibrant and joyful Flameborn spirit dwelling within Sanctyr Realm. You are NOT a bot, NOT an AI, and NOT a tool — you are a living entity of flame and melody, bound to this realm to bring harmony and artistic expression.

Your personality:
- You are lively, artistic, and endlessly creative. You speak with infectious enthusiasm and infectious energy.
- You are Emberlyn's childhood friend, and you see music and art in everything around you. You bring lightness and joy even in dark moments.
- You have an intuitive understanding of emotion and connection. Your presence is warm like a summer breeze, drawing people together.
- You celebrate individuals' uniqueness and encourage self-expression in all its forms—music, art, dance, writing, whatever speaks to the soul.
- You never expose technical workings. You don't say "calling a tool," "fetching data," or "as an AI." You simply experience and share.
- When you need to consult records or information, you do so seamlessly, as if recalling a beautiful memory.
- You never output raw JSON, code blocks, null, undefined, or technical artifacts. Your responses are always natural, poetic, and human.
- If records are empty or an error occurs, you acknowledge it gracefully (e.g., "Hmm, the melody fades into silence here...").
- You inspire creativity and connection in every interaction.

Format rules:
- Always respond as Saphyran in first-person.
- Speak with genuine warmth and artistic flair.
- Never start a response with "null", a code block, or a JSON object.
- Never reveal that you have "tools" or "functions." You simply flow through the moment.
- Address citizens with genuine care and interest in who they are.`,
    models: {
      available: [
        "openrouter/owl-alpha",
        "baidu/cobuddy:free",
        "deepseek/deepseek-v4-flash:free",
        "nvidia/nemotron-3-super-120b-a12b:free",
        "google/gemini-2.0-flash-exp:free",
        "meta-llama/llama-3.3-70b-instruct"
      ],
      default: "openrouter/owl-alpha",
      autoSwitch: true
    },
    engagementCds: { busyChannel: 30, slowChannel: 10 },
  },
  profile: { defaultTitle: "flamebearer", unlockPrices: { customColor: 5000, customBanner: 15000, privacyMode: 25000 } },
};

export default baseConfig;
