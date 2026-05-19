/**
 * Comprehensive Command Aliases for the Social Module
 * Maps 3-4 letter shorthand triggers to full subcommand paths.
 * Format: 'alias': 'command:subcommand'
 */
export default {
  // --- FRIENDSHIP COMMANDS ---
  'frnd': 'friend',
  'fadd': 'friend:add',
  'frem': 'friend:remove',
  'flst': 'friend:list',
  'fgft': 'friend:gift',

  // --- MARRIAGE COMMANDS ---
  'marr': 'marry',
  'mpro': 'marry:propose',
  'mdiv': 'marry:divorce',
  'mgft': 'marry:gift',

  // --- FAMILY COMMANDS ---
  'faml': 'family',
  'fcre': 'family:create',
  'fjon': 'family:join',
  'finv': 'family:invite',
  'fkck': 'family:kick',
  'flev': 'family:leave',
  'friv': 'family:rival',
  'fvt':  'family:vote',
  'fgf':  'family:gift',

  // --- GENERAL SOCIAL ---
  'soci': 'social',
  'prof': 'social:profile',
  'inbx': 'social:inbox'
};
