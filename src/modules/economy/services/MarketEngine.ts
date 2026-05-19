import { flamebornConfig } from '../../../config/flameborn.config';
import { RedisService } from '../../../services/RedisService';

export interface MarketResource {
  id: string;
  name: string;
  basePrice: number;
  currentPrice: number;
  volatility: number;
  supply: number;
  demand: number;
  lastPrice: number;
}

export class MarketEngine {
  /**
   * Initializes or fetches a resource from the market.
   */
  static async getResource(id: string, basePrice: number): Promise<MarketResource> {
    const key = `market:resource:${id}`;
    const cached = await RedisService.get(key);
    
    if (cached) {
      return JSON.parse(cached);
    }

    const resource: MarketResource = {
      id,
      name: id.replace('_', ' ').toUpperCase(),
      basePrice,
      currentPrice: basePrice,
      volatility: 0.05,
      supply: 1000,
      demand: 1000,
      lastPrice: basePrice,
    };

    await RedisService.set(key, JSON.stringify(resource));
    return resource;
  }

  /**
   * Adjusts price based on activity.
   * Logic: Supply UP -> Price DOWN | Demand UP -> Price UP
   */
  static async applyMarketPressure(id: string, amount: number, type: 'supply' | 'demand') {
    const resource = await this.getResource(id, 100); // Default base if not found

    if (type === 'supply') {
      resource.supply += amount;
    } else {
      resource.demand += amount;
    }

    // Price adjustment formula: Base * (Demand / Supply)
    const ratio = resource.demand / resource.supply;
    const shift = (ratio - 1) * resource.volatility;
    
    resource.lastPrice = resource.currentPrice;
    resource.currentPrice = Math.max(
      resource.basePrice * 0.1, // Floor at 10%
      resource.currentPrice * (1 + shift)
    );

    await RedisService.set(`market:resource:${id}`, JSON.stringify(resource));
    return resource;
  }

  /**
   * Returns all current prices for a guild dashboard.
   */
  static async getPrices() {
    const keys = await RedisService.client.keys('market:resource:*');
    if (keys.length === 0) return [];

    const rawData = await RedisService.mget(keys);
    return rawData
      .filter((d): d is string => d !== null)
      .map(d => JSON.parse(d) as MarketResource);
  }
}
