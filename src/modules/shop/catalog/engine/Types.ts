import { ActionRowBuilder } from 'discord.js';

export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

/**
 * The core structure for every item in the marketplace.
 */
export interface ShopItem {
  id: string;               // Unique across all categories
  name: string;
  description: string;
  basePrice: number;
  rarity: Rarity;
  category: string;         // The identifier of the parent category
  emoji?: string;
  image?: string;
  
  // Advanced Functional Hooks
  requirements?: (user: any, guild: any) => Promise<{ success: boolean, reason?: string }>;
  onPurchase?: (user: any, guild: any, instance: any) => Promise<void>;
  onUse?: (interaction: any, tenantId: string, guildId: string, userId: string, instance: any) => Promise<void>;
  onRender?: (builder: any) => void;
  
  // Custom metadata for specific module usage
  metadata?: Record<string, any>;
  opensModal?: boolean;
}

/**
 * Configuration manifest for an entire marketplace department.
 */
export interface ShopCategory {
  identifier: string;
  name: string;
  emoji?: string;
  description?: string;
  banner?: string;
  color?: string;
  
  // Permission or global logic for the whole category
  requirements?: (user: any, guild: any) => Promise<{ success: boolean, reason?: string }>;
}

/**
 * Registry storage structure
 */
export interface RegistryData {
  categories: Map<string, ShopCategory>;
  items: Map<string, ShopItem>;
}
