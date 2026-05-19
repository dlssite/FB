export interface TechNode {
  id: string;
  name: string;
  description: string;
  cost: number;
  emoji: string;
  category: 'economy' | 'social' | 'military' | 'utility';
  requires?: string[]; // IDs of nodes required before this can be purchased
}

export const FACTION_TECH_TREE: TechNode[] = [
  // --- UTILITY ---
  {
    id: 'util_member_cap_1',
    name: 'Expanded Barracks I',
    description: 'Increases the maximum member capacity of your Faction by 10.',
    cost: 50000,
    emoji: '⛺',
    category: 'utility'
  },
  {
    id: 'util_member_cap_2',
    name: 'Expanded Barracks II',
    description: 'Increases the maximum member capacity of your Faction by 25.',
    cost: 150000,
    emoji: '🏕️',
    category: 'utility',
    requires: ['util_member_cap_1']
  },
  {
    id: 'util_bank_cap_1',
    name: 'Reinforced Vault I',
    description: 'Increases the Faction Bank maximum storage limit.',
    cost: 75000,
    emoji: '🏦',
    category: 'utility'
  },

  // --- ECONOMY ---
  {
    id: 'eco_work_boost_1',
    name: 'Industrial Syndication I',
    description: 'All members receive a permanent +5% boost to /work payouts.',
    cost: 100000,
    emoji: '🏭',
    category: 'economy'
  },
  {
    id: 'eco_daily_boost_1',
    name: 'Ration Subsidies',
    description: 'All members receive +10% more Embers from /daily.',
    cost: 125000,
    emoji: '🍞',
    category: 'economy'
  },

  // --- SOCIAL ---
  {
    id: 'soc_custom_colors',
    name: 'Syndicate Colors',
    description: 'Allows the Faction Leader to customize the hex color of the Faction\'s Discord Roles.',
    cost: 50000,
    emoji: '🎨',
    category: 'social'
  },
  {
    id: 'soc_alliance_cap',
    name: 'Diplomatic Envoys',
    description: 'Allows your Faction to form up to 3 official Alliances simultaneously.',
    cost: 200000,
    emoji: '🤝',
    category: 'social',
    requires: ['soc_custom_colors']
  },

  // --- MILITARY ---
  {
    id: 'mil_war_chest_1',
    name: 'War Chest I',
    description: 'When winning a Rivalry Skirmish, steal 5% more from the enemy Bank.',
    cost: 300000,
    emoji: '⚔️',
    category: 'military'
  }
];

export class TechTreeService {
    static getAvailableUpgrades(unlockedPerks: string[]): TechNode[] {
        return FACTION_TECH_TREE.filter(node => {
            // If already unlocked, skip
            if (unlockedPerks.includes(node.id)) return false;

            // If it has requirements, check if they are met
            if (node.requires && node.requires.length > 0) {
                const hasAllRequirements = node.requires.every(req => unlockedPerks.includes(req));
                if (!hasAllRequirements) return false;
            }

            return true;
        });
    }

    static getNode(nodeId: string): TechNode | undefined {
        return FACTION_TECH_TREE.find(n => n.id === nodeId);
    }
}
