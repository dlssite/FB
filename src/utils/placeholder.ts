import { Guild, GuildMember, User } from 'discord.js';

export class PlaceholderService {
  /**
   * Replaces placeholders in a string with actual data.
   * Format: {user.mention}, {server.name}, etc.
   */
  static parse(text: string | null, data: { member?: GuildMember; user?: User; guild?: Guild }): string {
    if (!text) return '';

    let parsed = text;
    const { member, user, guild } = data;
    const targetUser = user || member?.user;

    // User Placeholders
    if (targetUser) {
      parsed = parsed.replace(/{user.mention}/g, targetUser.toString());
      parsed = parsed.replace(/{user.name}/g, targetUser.username);
      parsed = parsed.replace(/{user.id}/g, targetUser.id);
      parsed = parsed.replace(/{user.tag}/g, targetUser.tag);
    }

    // Guild Placeholders
    const targetGuild = guild || member?.guild;
    if (targetGuild) {
      parsed = parsed.replace(/{server.name}/g, targetGuild.name);
      parsed = parsed.replace(/{server.id}/g, targetGuild.id);
      parsed = parsed.replace(/{member.count}/g, targetGuild.memberCount.toString());
    }

    return parsed;
  }
}
