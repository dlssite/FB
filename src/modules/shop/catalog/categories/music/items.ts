import { ShopItem } from '../../engine/Types';

export const musicItems: ShopItem[] = [
  {
    id: 'instant_skip',
    name: 'Instant Skip Token',
    description: 'Bypass the democracy and instantly skip the current track.',
    basePrice: 500,
    category: 'music',
    emoji: '⏭️',
    rarity: 'rare',
    metadata: {
      action: 'music:skip',
      ephemeral: true
    }
  },
  {
    id: 'priority_queue',
    name: 'Priority Queue Ticket',
    description: 'Move your next request to the absolute front of the queue.',
    basePrice: 1500,
    category: 'music',
    emoji: '🎫',
    rarity: 'epic',
    metadata: {
      action: 'music:priority',
      ephemeral: true
    }
  },
  {
    id: 'concert_ticket',
    name: 'Concert Pass',
    description: 'A premium ticket granting access to exclusive stage events and 2x XP.',
    basePrice: 5000,
    category: 'music',
    emoji: '🎫',
    rarity: 'legendary',
    metadata: {
      action: 'music:event_access'
    }
  }
];
