export const manifest = {
  id: 'reactions',
  name: 'Self-Reaction Module',
  version: '1.0.0',
  description: 'Advanced self-reaction role assignment system with dropdown selection and emoji link reactions',
  author: 'Copilot',
  enabled: true,
  dependencies: [],
  commands: ['reactions'],
  events: ['interactionCreate', 'messageReactionAdd', 'messageReactionRemove'],
  database: {
    models: [
      'reaction_self_panels',
      'reaction_self_items',
      'reaction_self_user_roles',
      'reaction_emoji_links'
    ]
  },
  features: {
    panelCreation: true,
    dropdownSelection: true,
    emojiReactionLinks: true,
    mutualExclusivity: true,
    roleHierarchy: true,
    adminControls: true,
    analytics: true
  }
};
