/**
 * Interface for dynamic Profile Providers.
 * Any module (Economy, Leveling, Streaks, Factions, etc.) can register a provider
 * to inject its statistics into the universal Profile V2 Container and AI Manifest.
 */
export interface ProfileProvider {
  /** Name of the module providing data (e.g. 'economy', 'leveling') */
  moduleName: string;
  
  /** Priority determines the order in which sections appear on the profile UI (lower number = higher up) */
  priority: number;
  
  /**
   * Retrieves fields to be displayed on the Discord V2 Container profile.
   */
  getContainerFields(tenantId: string, guildId: string, userId: string): Promise<{ name: string; value: string; inline?: boolean }[]>;
  
  /**
   * Retrieves raw structured data to be included in the AI Manifest profile summary.
   */
  getAiData(tenantId: string, guildId: string, userId: string): Promise<Record<string, any>>;
}
