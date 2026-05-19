import { SlashCommandBuilder, AutocompleteInteraction, PermissionFlagsBits } from 'discord.js';
import { tenantStorage } from '../../../../utils/context';
import { prisma } from '../../../../database/client';
import { Logger } from '../../../../utils/logger';

export default {
  data: new SlashCommandBuilder()
    .setName('giveaway')
    .setDescription('🎁 Manage server giveaways and drops')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
};
