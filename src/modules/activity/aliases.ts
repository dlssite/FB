/**
 * Prefix command aliases for the Activity & Telemetry module.
 * Maps shorthand triggers → slash subcommand routing keys.
 * Format: 'alias': 'command:subcommand'
 */
export const activityAliases = {
  // User dossier shortcuts
  'activity':     'activity:user',
  'stats':        'activity:user',
  'mystats':      'activity:user',
  'profile-stats': 'activity:user',

  // Server analytics shortcuts
  'serverstats':  'activity:server',
  'serverinfo-stats': 'activity:server',
  'growth':       'activity:server',

  // Leaderboard shortcuts
  'alb':           'activity:leaderboard',
  'actlb':        'activity:leaderboard',
  'topchat':      'activity:leaderboard',
  'topvoice':     'activity:leaderboard',
};
