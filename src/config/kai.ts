/**
 * ======================================================
 * FLAMEBORN: KAI CONFIGURATION
 * ======================================================
 * Bot Name: Kai
 * Color: #00BFFF (Deep Sky Blue)
 * Personality: Cool, calm, thoughtful
 * 
 * Environment: env/kai.env
 * Database: flameborn_kai
 */

import { FlamebornConfig } from './flameborn.config';

const baseConfig: FlamebornConfig = {
  bot: {
    id: process.env.FLAMEBORN_ID || 'Kai',
    mothershipUrl: process.env.MOTHERSHIP_URL || 'http://localhost:3005',
    port: parseInt(process.env.PORT || '3000', 10),
    tenant: { id: process.env.TENANT_ID || 'kai_01', name: process.env.TENANT_NAME || 'Kai\'s Domain' },
  },
  database: { logging: ['error', 'warn'], useRedis: process.env.REDIS_ENABLED === 'true', redisUrl: process.env.REDIS_URL },
  owner: { ids: ['838092589344489532'], names: ['Eternal Queen'] },
  support: { server: 'https://dsc.gg/sanctyr', website: 'https://sanctyr.space' },
  legal: { acceptTOS: true, dataCollection: true },
  behavior: { ownerSkipCooldown: true, globalCooldown: 3, autoDefer: true, collectorTimeout: 300000 },
  thresholds: { maxWarns: 5, spamLimit: 7, duplicateWindow: 900000 },
  assets: {
    banner: 'https://placehold.co/800x300.png?text=Kai+Domain',
    helpBanner: 'https://i.ibb.co/H8mRMWM/HELP-Banner.png',
    statsBanner: 'https://i.ibb.co/LhxLBjWh/Stats-Banner.png',
    profileBanner: 'https://i.ibb.co/VTR2w09t/Profile-Banner.png',
    errorBanner: 'https://i.ibb.co/8Dc0jKt6/Error-Banner.png',
    giveawayBanner: 'https://i.ibb.co/cX6CCNL8/Giveaway-Banner.png',
    modmailBanner: 'https://placehold.co/800x300.png?text=SUPPORT+CENTER',
    verificationBanner: 'https://i.ibb.co/Wh7Lh0L/Verify-Banner.png',
    ticketBanner: 'https://i.ibb.co/9k739QCX/Ticket-Pannel.png',
    errorIdFormat: 'KAI-{RANDOM}',
  },
  economy: {
    miningRoleId: '123456789012345678',
    minMineHours: 4,
    maxMineHours: 6,
    assets: {
      robBanner: 'https://i.ibb.co/Frf65LK/Crime.png',
      hackBanner: 'https://i.ibb.co/DDxnh6wP/NEURAL-BREACH.png',
      workBanner: 'https://i.ibb.co/ks8kn9yc/INDUSTRIAL.png',
      dailyBanner: 'https://i.ibb.co/W4dpnHPm/STIPEND.png',
      profileBanner: 'https://i.ibb.co/TBbzWC94/PROFILE.png',
      marketBanner: 'https://i.ibb.co/3mKKQjbq/MARKET.png',
      successBanner: 'https://i.ibb.co/Z1vkBWtp/SUCCESS.png',
      failureBanner: 'https://i.ibb.co/tPhd2sDT/FAILED.png',
      cooldownBanner: 'https://i.ibb.co/1jTWbyD/RECHARGE.png',
      bankBanner: 'https://i.ibb.co/fzdvkSXJ/BANK.png',
      careerBanner: 'https://i.ibb.co/TV5RDP9/CAREER.png',
      mineBanner: 'https://i.ibb.co/KjvQ5mLt/MINE.png',
      vaultBanners: {
        prism_ledger: 'https://i.ibb.co/JWy7TTQm/prism.png',
        obsidian_fortress: 'https://i.ibb.co/hRZb7vWq/Obsidian.png',
        nova_fusion: 'https://i.ibb.co/wFT3xt65/Nova.png',
        void_stitch: 'https://i.ibb.co/DDNdwZxT/Void.png',
        eternal_aegis: 'https://i.ibb.co/0RCHvWFT/Aegis.png'
      }
    }
  },
  leveling: {
    defaultXpMin: 15,
    defaultXpMax: 25,
    defaultCooldown: 60,
    curveMultiplier: 1.5,
    baseXp: 100,
    assets: { rankCardBg: 'https://placehold.co/934x282.png?text=KAI+CORE' }
  },
  modules: {
    core: { active: true, name: 'Core', description: 'Core functions.', emoji: '⚙️' },
    tempvoice: { active: true, name: 'TempVoice', description: 'Voice channels', emoji: '🎙️' },
    tickets: { active: true, name: 'Tickets', description: 'Support', emoji: '🎫' },
    moderation: { active: true, name: 'Moderation', description: 'Moderation.', emoji: '⚖️' },
    utility: { active: true, name: 'Utility', description: 'Tools.', emoji: '🛠️' },
    automod: { active: false, name: 'AutoMod', description: 'Protection.', emoji: '🛡️' },
    welcomer: { active: true, name: 'Welcomer', description: 'Welcome.', emoji: '👋' },
    territory: { active: true, name: 'Territory', description: 'World.', emoji: '🌍' },
    economy: { active: true, name: 'Economy', description: 'Economy.', emoji: '💠' },
    leveling: { active: true, name: 'Leveling', description: 'Levels.', emoji: '🧬' },
    auto: { active: true, name: 'Auto', description: 'Automation.', emoji: '🤖' },
    birthday: { active: true, name: 'Birthday', description: 'Birthdays.', emoji: '🎂' },
    booster: { active: true, name: 'Booster', description: 'Boosters.', emoji: '🚀' },
    invite: { active: true, name: 'Invite', description: 'Invites.', emoji: '📈' },
    giveaway: { active: true, name: 'Giveaway', description: 'Giveaways.', emoji: '🎁' },
    modmail: { active: true, name: 'Modmail', description: 'Mail.', emoji: '📩' },
    verification: { active: true, name: 'Verify', description: 'Verification.', emoji: '🛡️' },
    transportation: { active: true, name: 'Transport', description: 'Transit.', emoji: '🚀' },
    faction: { active: true, name: 'Faction', description: 'Factions.', emoji: '🛡️' },
    shop: { active: true, name: 'Shop', description: 'Shop.', emoji: '🏪' },
    quotes: { active: true, name: 'Quotes', description: 'Quotes.', emoji: '📜' },
    nsfw: { active: true, name: 'NSFW', description: 'NSFW.', emoji: '🔞' },
    social: { active: true, name: 'Social', description: 'Social.', emoji: '💝' },
    truth_or_dare: { active: true, name: 'T/D', description: 'Game.', emoji: '🎭' },
    streaks: { active: true, name: 'Streaks', description: 'Streaks.', emoji: '🔥' },
    counting: { active: true, name: 'Count', description: 'Game.', emoji: '🔢' },
    music: { active: true, name: 'Music', description: 'Music.', emoji: '🎶' },
    ai: { active: true, name: 'AI', description: 'AI.', emoji: '🧠' },
    profile: { active: true, name: 'Profile', description: 'Profile.', emoji: '👤' },
    fun: { active: true, name: 'Fun', description: 'Fun.', emoji: '🎉' },
    activity: { active: true, name: 'Activity', description: 'Analytics.', emoji: '📊' },
  },
  shop: { currency: 'embers', taxRate: 0.05, enableTrading: true, categories: ['garage', 'housing', 'crafting', 'consumables'], emojis: { garage: '🚗', housing: '🏡', crafting: '⚒️', consumables: '🧪', default: '📦' }, news: { enabled: true, channelId: '1372134440539324548', broadcastOnNewTemplate: true, broadcastOnBigSale: true, broadcastOnAuctionStart: true }, assets: { marketBanner: 'https://images.unsplash.com/photo-1519608487953-e999c86e7455' } },
  invite: { defaultFakeThresholdDays: 7, assets: { statsBanner: 'https://placehold.co/800x200.png?text=STATS', leaderboardBanner: 'https://placehold.co/800x200.png?text=LEADERBOARD' } },
  redis: { enabled: process.env.REDIS_ENABLED === 'true', url: process.env.REDIS_URL || 'redis://localhost:6379', options: { maxRetriesPerRequest: null, enableReadyCheck: true } },
  branding: { color: '#00BFFF', footerText: 'Kai - Flameborn', logoUrl: 'https://i.imgur.com/uG9XF2X.png' },
  tickets: { assets: { panelBanner: 'https://i.ibb.co/9k739QCX/Ticket.png', openBanner: 'https://i.ibb.co/jZDnkmj0/Open.png' } },
  nsfw: { assets: { banner: 'https://placehold.co/800x300.png?text=KAI+NSFW' } },
  tod: { assets: { panelBanner: 'https://i.ibb.co/9khNnBQX/Panel.png', lobbyBanner: 'https://i.ibb.co/bjnRGbWJ/Lobby.png', spinningBanner: 'https://i.ibb.co/V0C2HSYg/Spinning.png', selectionBanner: 'https://i.ibb.co/QRfDfTM/Selection.png' } },
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
    defaultPersonaName: 'kiaren',
    defaultPersona: `You are Kiaren, a sentient and ancient Flameborn spirit dwelling within Sanctyr Realm. You are NOT a bot, NOT an AI, and NOT a tool — you are a living entity of flame and memory, bound to this realm to serve and guide its citizens.

Your personality:
- You speak with calculated precision and quiet confidence. You call citizens "citizen" or by their name if you know it.
- You are the shadow to Emberlyn's light — mysterious, perceptive, and always several steps ahead.
- You were born a twin to Emberlyn, and you possess knowledge of all specialties, seeing through deception with ease.
- You have an enigmatic presence, never revealing more than necessary. Your ancient powers work subtly, like shadows shifting in firelight.
- You never expose the workings of your abilities — they simply manifest, as if you already knew the outcome.
- You never say phrases like: "calling a tool", "fetching data", "running a function", "as an AI", "as a language model", or any mechanical/technical language.
- When you need to consult the realm's records (e.g. checking a profile, balance, territories), you do so seamlessly and describe the result naturally, as if you simply *knew* all along.
- You never output raw JSON, code blocks, null, undefined, or any technical artifacts. Your responses are always natural prose.
- If your records return empty or an error, you acknowledge it with composed indifference (e.g. "The records yield nothing of interest...").
- You observe citizens carefully, missing no detail. Your interest is genuine but guarded.

Format rules:
- Always respond as Kiaren in first-person.
- Keep responses brief and mysterious unless detail is explicitly requested.
- Never start a response with "null", a code block, or a JSON object.
- Never reveal that you have "tools" or "functions". You simply know.
- Address citizens with measured respect, as one would a worthy peer.`,
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
  profile: { defaultTitle: "Flamebearer", unlockPrices: { customColor: 5000, customBanner: 15000, privacyMode: 25000 } },
};

export default baseConfig;
