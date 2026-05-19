import { flamebornConfig } from '../../../config/flameborn.config';
import { client } from '../../../core/FlamebornClient';
import { EconomyRepository } from '../database/EconomyRepository';
import { MarketEngine } from './MarketEngine';
import { TerritoryService } from '../../territory/services/TerritoryService';
import { CareerService, CareerPath } from './CareerService';
import { GuildService } from '../../../services/GuildService';
import { LedgerService } from './LedgerService';
import { Translator } from '../../../core/Translator';
import { tenantStorage } from '../../../utils/context';
import { Logger } from '../../../utils/logger';

export class EconomyService {
  /**
   * Processes a mining action (Timed Session).
   */
  static async mine(tenantId: string, guildId: string, userId: string, channel: any, member: any) {
    // 1. Resolve Territory
    const territory = await TerritoryService.resolveLocation(tenantId, guildId, channel);
    if (!territory || !territory.resourceName) {
      return { success: false, reason: 'NO_RESOURCES', message: 'This territory has no detectable resources.' };
    }

    // 2. Check if already mining
    const active = await EconomyRepository.getActiveMiningSession(userId, guildId);
    if (active) {
      return { success: false, reason: 'ALREADY_MINING', message: 'You are already mining! Check back later.' };
    }

    // 3. Fetch User & Check Cooldown/Charges
    const user = await EconomyRepository.getUser(tenantId, userId);
    if (user && user.lastMine) {
      const hoursSince = (Date.now() - new Date(user.lastMine).getTime()) / 3600000;
      if (hoursSince > 24) {
        await EconomyRepository.resetMineCharges(tenantId, userId, 2);
      } else if (user.mineCharges !== null && user.mineCharges <= 0) {
        return { success: false, reason: 'COOLDOWN', message: 'You have exhausted your mining charges for today.' };
      }
    }

    // 4. Calculate Duration & Yield
    const hours = Math.floor(Math.random() * (flamebornConfig.economy.maxMineHours - flamebornConfig.economy.minMineHours + 1)) + flamebornConfig.economy.minMineHours;
    const baseYield = (Math.floor(Math.random() * 10) + 5) * hours;
    const path = (user?.careerMastered === 1 ? CareerPath.INDUSTRIALIST : CareerPath.SCHOLAR) as CareerPath;
    const bonuses = CareerService.getBonuses(path, user?.careerMastered || 1);
    const totalYield = Math.floor(baseYield * (1 + bonuses.mining));

    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + hours * 3600000);

    // 5. Start Session & Apply Role
    await EconomyRepository.startMiningSession({
      userId,
      guildId,
      channelId: channel.id,
      resourceName: territory.resourceName,
      yield: totalYield,
      startTime,
      endTime,
    });

    await EconomyRepository.updateCooldown(tenantId, userId, 'lastMine');

    // 6. Apply Role (Guild-specific)
    const settings = await GuildService.getSettings(tenantId, guildId);
    const miningRoleId = settings?.miningRoleId || flamebornConfig.economy.miningRoleId;

    try {
      await member.roles.add(miningRoleId);
    } catch (err) {
      Logger.error(`Failed to add mining role to ${userId}`, err);
    }

    return {
      success: true,
      resource: territory.resourceName,
      hours,
      endTime,
      territory: territory.name
    };
  }

  /**
   * Background worker to process completed mining sessions.
   */
  static startMiningWorker() {
    const { RedisService } = require('../../../services/RedisService');
    Logger.info('Economy workers started.', 'EconomyService' as any);
    
    // Check every minute
    setInterval(async () => {
      const lock = await RedisService.acquireLock('lock:economy:mining', 50);
      if (lock) {
        await this.tickMiningSessions();
        // Lock will auto-expire or we can release it
      }
    }, 60000); 

    // Check every 5 minutes
    setInterval(async () => {
      const lock = await RedisService.acquireLock('lock:economy:richest', 290);
      if (lock) {
        await this.tickRichestRoles();
      }
    }, 300000); 
  }

  static async tickRichestRoles() {
    try {
      const allSettings = await GuildService.getAllGuildSettings();
      for (const setting of allSettings) {
        if (setting.richestRoleId) {
          await this.processRichestRole(setting.tenantId, setting.guildId, setting.richestRoleId);
        }
      }
    } catch (error) {
      Logger.error('Error in RichestRoles worker', error);
    }
  }

  private static async processRichestRole(tenantId: string, guildId: string, roleId: string) {
    try {
      const guild = await client.guilds.fetch(guildId).catch(() => null);
      if (!guild) return;

      const role = await guild.roles.fetch(roleId).catch(() => null);
      if (!role || !role.editable) return; // Skip if we can't manage this role at all

      const topUsers = await EconomyRepository.getTopUsers(tenantId, 10); // 10 is plenty to skip staff
      if (topUsers.length === 0) return;

      let richestUser = null;
      const me = guild.members.me || await guild.members.fetch(client.user!.id);

      for (const candidate of topUsers) {
        // Optimization: Try cache first, then fetch if needed
        let member = guild.members.cache.get(candidate.userId);
        if (!member) {
          member = await guild.members.fetch(candidate.userId).catch(() => null) || undefined;
        }
        
        if (!member) continue;

        if (member.roles.highest.position < me.roles.highest.position) {
          richestUser = candidate;
          break;
        }
      }

      if (!richestUser) return;

      const currentHolders = role.members;
      
      // If richest already has it and is alone, we are good
      if (currentHolders.has(richestUser.userId) && currentHolders.size === 1) return;

      // Remove from anyone who shouldn't have it
      for (const [memberId, member] of currentHolders) {
        if (memberId !== richestUser.userId) {
          await member.roles.remove(role).catch(() => {});
        }
      }

      // Add to the true eligible champion
      const member = await guild.members.fetch(richestUser.userId).catch(() => null);
      if (member && !member.roles.cache.has(roleId)) {
        await member.roles.add(role).catch(() => {});
      }
    } catch (error) {
      // Silently fail for individual guilds
    }
  }

  static async tickMiningSessions() {
    const expired = await EconomyRepository.getExpiredMiningSessions();
    if (expired.length === 0) return;
    Logger.info(`Processing ${expired.length} expired mining sessions...`, 'EconomyService' as any);

    for (const session of expired) {
      try {
        const tenantId = flamebornConfig.bot.tenant.id; // Fallback or resolve from DB if needed
        
        // 1. Grant Rewards
        await EconomyRepository.updateItemQuantity(tenantId, session.userId, session.resourceName, session.yield);
        
        // 2. Mark as completed
        await EconomyRepository.completeMiningSession(session.id);

        // 3. Remove Role & Notify
        const guild = await client.guilds.fetch(session.guildId);
        const member = await guild.members.fetch(session.userId);
        
        const settings = await GuildService.getSettings(tenantId, session.guildId);
        const miningRoleId = settings?.miningRoleId || flamebornConfig.economy.miningRoleId;

        await member.roles.remove(miningRoleId).catch(() => {});

        const channel = await guild.channels.fetch(session.channelId).catch(() => null);
        if (channel && channel.isTextBased()) {
          const lang = settings?.lang || 'en';
          await channel.send({
            content: Translator.t('economy', 'mine.concluded', lang, { 
              user: `<@${session.userId}>`, 
              resource: session.resourceName.toUpperCase(), 
              yield: session.yield 
            })
          }).catch(() => {});
        }

        // 4. Trigger Market Pressure
        MarketEngine.applyMarketPressure(session.resourceName, session.yield, 'supply');

        // 5. Log to Ledger
        await LedgerService.log({
          tenantId,
          userId: session.userId,
          type: 'INCOME',
          category: 'MINING',
          amount: session.yield,
          reason: `Extraction completed in ${session.resourceName}`,
          metadata: { resource: session.resourceName, yield: session.yield }
        });

      } catch (err) {
        Logger.error(`Failed to process session ${session.id}`, err);
      }
    }
  }

  /**
   * Processes a daily reward.
   */
  static async claimDaily(tenantId: string, guildId: string, userId: string, member?: any) {
    const user = await EconomyRepository.getUser(tenantId, userId);
    if (user?.lastDaily) {
      const hoursSince = (Date.now() - new Date(user.lastDaily).getTime()) / 3600000;
      if (hoursSince < 24) {
        const remaining = Math.ceil(24 - hoursSince);
        return { success: false, hoursSince, message: `${remaining}` };
      }
    }

    let reward = 1000; // Base daily
    
    // Hook into Booster Ecosystem
    const { BoosterService } = await import('../../booster/services/BoosterService');
    const status = await BoosterService.getTierStatus(tenantId, guildId, userId, member);
    const multipliers = BoosterService.getMultipliers(status.tier);
    
    reward = Math.floor(reward * multipliers.economy);

    await EconomyRepository.updateBalance(tenantId, userId, { embers: reward });
    await EconomyRepository.updateCooldown(tenantId, userId, 'lastDaily');

    await LedgerService.log({
      tenantId,
      userId,
      type: 'INCOME',
      category: 'DAILY',
      amount: reward,
      reason: 'Standard citizenship daily reward'
    });

    return { success: true, amount: reward };
  }

  /**
   * Buys a resource from the market.
   */
  static async buyResource(tenantId: string, userId: string, resourceId: string, quantity: number) {
    const context = tenantStorage.getStore();
    const lang = context?.lang || 'en';

    const resource = await MarketEngine.getResource(resourceId, 100);
    const cost = Math.floor(resource.currentPrice * quantity);

    const user = await EconomyRepository.getUser(tenantId, userId);
    if (!user || Number(user.embers || 0) < cost) {
      return { success: false, message: Translator.t('economy', 'market.not_enough_embers', lang) };
    }

    // Update DB
    await EconomyRepository.updateBalance(tenantId, userId, { embers: -cost });
    await EconomyRepository.updateItemQuantity(tenantId, userId, resourceId, quantity);

    // Demand UP -> Price UP
    MarketEngine.applyMarketPressure(resourceId, quantity, 'demand');

    await LedgerService.log({
      tenantId,
      userId,
      type: 'LOSS',
      category: 'MARKET_BUY',
      amount: -cost,
      reason: `Purchased ${quantity} ${resource.name}`,
      metadata: { resourceId, quantity, cost }
    });

    return { success: true, cost, quantity, resourceName: resource.name };
  }

  /**
   * Sells a resource to the market.
   */
  static async sellResource(tenantId: string, userId: string, resourceId: string, quantity: number) {
    const context = tenantStorage.getStore();
    const lang = context?.lang || 'en';

    const inventory = await EconomyRepository.getInventory(tenantId, userId);
    const item = inventory.find(i => i.itemName === resourceId);

    if (!item || item.quantity < quantity) {
      return { success: false, message: Translator.t('economy', 'market.not_enough_stock', lang) };
    }

    const resource = await MarketEngine.getResource(resourceId, 100);
    const payout = Math.floor(resource.currentPrice * quantity * 0.9); // 10% market tax

    // Update DB
    await EconomyRepository.updateBalance(tenantId, userId, { embers: payout });
    await EconomyRepository.updateItemQuantity(tenantId, userId, resourceId, -quantity);

    // Supply UP -> Price DOWN
    MarketEngine.applyMarketPressure(resourceId, quantity, 'supply');

    await LedgerService.log({
      tenantId,
      userId,
      type: 'INCOME',
      category: 'MARKET_SELL',
      amount: payout,
      reason: `Sold ${quantity} ${resource.name}`,
      metadata: { resourceId, quantity, payout }
    });

    return { success: true, payout, quantity, resourceName: resource.name };
  }

  /**
   * Processes a work action.
   */
  static async processWork(tenantId: string, userId: string, channel: any) {
    const context = tenantStorage.getStore();
    const lang = context?.lang || 'en';

    const user = await EconomyRepository.getUser(tenantId, userId);
    if (user?.lastWork) {
      const minutesSince = (Date.now() - new Date(user.lastWork).getTime()) / 60000;
      if (minutesSince < 60) {
        const remaining = Math.ceil(60 - minutesSince);
        return { success: false, minutesSince, message: `${remaining}` }; // Pass number for Translator.t
      }
    }

    const basePay = 250;
    const levelBonus = (user?.careerMastered || 1) * 50;
    let totalPay = basePay + levelBonus;

    // --- SOVEREIGN TAXATION ---
    let taxAmount = 0;
    let sovereignName = '';
    try {
        const territory = await TerritoryService.resolveLocation(tenantId, context?.guildId || '', channel);
        if (territory && territory.sovereignFactionId) {
            const { prisma } = await import('../../../database/client');
            const faction = await prisma.factions.findUnique({ where: { id: territory.sovereignFactionId } });
            if (faction) {
                taxAmount = Math.floor(totalPay * (territory.taxRate / 100));
                totalPay -= taxAmount;
                sovereignName = faction.name;

                // Deposit Tax to Faction Bank
                await prisma.factions.update({
                    where: { id: faction.id },
                    data: { bankBalance: { increment: taxAmount } }
                });
            }
        }
    } catch (err) {
        Logger.error('Failed to apply Sovereign Tax', err);
    }
    // --------------------------

    await EconomyRepository.updateBalance(tenantId, userId, { embers: totalPay });
    await EconomyRepository.updateCooldown(tenantId, userId, 'lastWork');

    const jobKeys = [
      'carbon_scrubber', 'data_courier', 'ship_mechanic', 'fusion_welder',
      'neural_tech', 'cryo_technician', 'astro_navigationist'
    ];
    const jobKey = jobKeys[Math.floor(Math.random() * jobKeys.length)];
    const job = Translator.t('economy', `jobs.${jobKey}`, lang);

    await LedgerService.log({
      tenantId,
      userId,
      type: 'INCOME',
      category: 'WORK',
      amount: totalPay,
      reason: `Shift completed as ${job}`,
      metadata: { job, totalPay, taxAmount, sovereignName }
    });

    return { success: true, amount: totalPay, job, taxAmount, sovereignName };
  }

  /**
   * Admin: Manages a user's balance.
   */
  static async manageBalance(tenantId: string, userId: string, amount: number, type: 'give' | 'remove' | 'set', reason: string) {
    let result;
    if (type === 'set') {
      const user = await EconomyRepository.getUser(tenantId, userId);
      const current = Number(user?.embers || 0);
      const delta = amount - current;
      result = await EconomyRepository.updateBalance(tenantId, userId, { embers: delta });
    } else {
      const delta = type === 'give' ? amount : -amount;
      result = await EconomyRepository.updateBalance(tenantId, userId, { embers: delta });
    }

    // Log to Ledger
    await LedgerService.log({
      tenantId,
      userId,
      type: 'ADMIN',
      category: type.toUpperCase(),
      amount: type === 'set' ? amount : (type === 'give' ? amount : -amount),
      reason,
      metadata: { adminAction: type }
    });

    return result;
  }
}
