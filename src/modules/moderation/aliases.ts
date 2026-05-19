/**
 * Moderation Module Aliases
 * Maps shorthand prefix triggers to full Slash Commands.
 */
export const MODERATION_ALIASES: Record<string, string> = {
  'b': 'mod:ban',
  'k': 'mod:kick',
  'w': 'mod:warn',
  't': 'mod:timeout',
  'to': 'mod:timeout',
  'm': 'mod:timeout',
  'mute': 'mod:timeout',
  'ub': 'mod:unban',
  'unb': 'mod:unban',
  'ut': 'mod:untimeout',
  'um': 'mod:untimeout',
  'unmute': 'mod:untimeout',
  'mc': 'mod:history',
  'warns': 'mod:warnings',
  'clear': 'mod:clear',
  'slowmode': 'mod:slowmode',
  'lock': 'mod:lock',
  'unlock': 'mod:unlock'
};
