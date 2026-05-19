import { BaseItem } from '../../engine/BaseItem';
import { Rarity } from '../../engine/Types';

export abstract class SocialGift extends BaseItem {
  category = 'social';
  
  async onUse(interaction: any, tenantId: string, guildId: string, userId: string, instance: any): Promise<void> {
    const { ActionRowBuilder, StringSelectMenuBuilder } = await import('discord.js');
    const { ContainerService, replyV2 } = await import('../../../../../utils/container');
    const { prisma } = await import('../../../../../database/client');

    let eligibleUsers: { id: string, name: string }[] = [];
    let giftType = '';

    // 1. Identify Gift Type and Eligible Recipients
    if (instance.metadata.resonanceBonus) {
      giftType = 'Marriage';
      const marriage = await prisma.social_marriages.findFirst({
        where: { guildId, tenantId, status: 'married', OR: [{ user1Id: userId }, { user2Id: userId }] }
      });
      if (marriage) {
        const partnerId = marriage.user1Id === userId ? marriage.user2Id : marriage.user1Id;
        const partner = await interaction.client.users.fetch(partnerId).catch(() => null);
        if (partner) eligibleUsers.push({ id: partnerId, name: partner.username });
      }
    } else if (instance.metadata.reputationBonus) {
      giftType = 'Family';
      const membership = await prisma.social_family_members.findFirst({ where: { userId, status: 'accepted' } });
      if (membership) {
        const members = await prisma.social_family_members.findMany({
          where: { familyId: membership.familyId, status: 'accepted', userId: { not: userId } }
        });
        for (const m of members) {
          const user = await interaction.client.users.fetch(m.userId).catch(() => null);
          if (user) eligibleUsers.push({ id: m.userId, name: user.username });
        }
      }
    } else if (instance.metadata.bondBonus) {
      giftType = 'Friendship';
      const friends = await prisma.social_friends.findMany({
        where: { guildId, tenantId, status: 'accepted', OR: [{ user1Id: userId }, { user2Id: userId }] }
      });
      for (const f of friends) {
        const otherId = f.user1Id === userId ? f.user2Id : f.user1Id;
        const user = await interaction.client.users.fetch(otherId).catch(() => null);
        if (user) eligibleUsers.push({ id: otherId, name: user.username });
      }
    }

    // 2. Handle No Eligible Users
    if (eligibleUsers.length === 0) {
      let reason = 'You do not have any eligible recipients for this gift type.';
      if (giftType === 'Marriage') reason = '❌ You must be **Married** to use a marriage gift.';
      else if (giftType === 'Family') reason = '❌ You must be in a **Family** with other members to use this gift.';
      else if (giftType === 'Friendship') reason = '❌ You must have **Accepted Friends** to use this gift.';
      
      return await replyV2(interaction, ContainerService.simple(reason), true);
    }

    // 3. Render Selection Menu
    const select = new StringSelectMenuBuilder()
      .setCustomId(`social_gift_use_${instance.instanceId}`)
      .setPlaceholder(`Select a ${giftType} recipient...`)
      .addOptions(eligibleUsers.slice(0, 25).map(u => ({
        label: u.name,
        value: u.id,
        emoji: '👤'
      })));

    const row = new ActionRowBuilder().addComponents(select);

    await replyV2(interaction, ContainerService.create({
      title: `🎁 Gifting: ${instance.name}`,
      description: `This is a **${giftType}** gift. Select who you would like to present it to from your eligible contacts below:`,
      components: [row],
      interaction,
      footer: true
    }), true);
  }
}

class EternalRose extends SocialGift {
  id = 'gift_rose';
  name = 'Eternal Rose';
  description = 'A preserved rose that never wilts. Strengthens friendship bonds when gifted.';
  basePrice = 500;
  rarity: Rarity = 'common';
  emoji = '🌹';
  metadata = { bondBonus: 10 };
}

class BioChocolates extends SocialGift {
  id = 'gift_chocolates';
  name = 'Bio-Organic Chocolates';
  description = 'Exquisite chocolates made from synthesized cocoa. A sweet token of friendship.';
  basePrice = 750;
  rarity: Rarity = 'common';
  emoji = '🍫';
  metadata = { bondBonus: 15 };
}

class PlatinumBand extends SocialGift {
  id = 'gift_ring';
  name = 'Platinum Band';
  description = 'A simple yet elegant band. Significantly boosts marriage resonance when gifted to a spouse.';
  basePrice = 5000;
  rarity: Rarity = 'rare';
  emoji = '💍';
  metadata = { resonanceBonus: 50 };
}

class HolographicLocket extends SocialGift {
  id = 'gift_locket';
  name = 'Holographic Locket';
  description = 'Displays a rotating memory of your union. Greatly enhances resonance.';
  basePrice = 12000;
  rarity: Rarity = 'epic';
  emoji = '📿';
  metadata = { resonanceBonus: 150 };
}

class FamilySigil extends SocialGift {
  id = 'gift_family_sigil';
  name = 'Ancestral Sigil';
  description = 'An ancient crest used to honor family members. Boosts reputation within the dynasty.';
  basePrice = 8500;
  rarity: Rarity = 'rare';
  emoji = '⚜️';
  metadata = { reputationBonus: 100 };
}

class FriendshipBracelet extends SocialGift {
  id = 'gift_bracelet';
  name = 'Friendship Bracelet';
  description = 'A handmade token of appreciation. Increases Bond Score by 5.';
  basePrice = 200;
  rarity: Rarity = 'common';
  emoji = '🧵';
  metadata = { bondBonus: 5 };
}

class SyntheticWine extends SocialGift {
  id = 'gift_wine';
  name = 'Synthetic Wine';
  description = 'A vintage bottle from the pre-collapse era. Increases Bond Score by 20.';
  basePrice = 1200;
  rarity: Rarity = 'common';
  emoji = '🍷';
  metadata = { bondBonus: 20 };
}

class ChronoWatch extends SocialGift {
  id = 'gift_watch';
  name = 'Chrono-Watch';
  description = 'A precision timepiece for the modern colonist. Increases Bond Score by 40.';
  basePrice = 3500;
  rarity: Rarity = 'rare';
  emoji = '⌚';
  metadata = { bondBonus: 40 };
}

class RadiantGemstone extends SocialGift {
  id = 'gift_gem';
  name = 'Radiant Gemstone';
  description = 'A rare gem that glows with internal light. Increases Bond Score by 100.';
  basePrice = 15000;
  rarity: Rarity = 'epic';
  emoji = '💎';
  metadata = { bondBonus: 100 };
}

class StarMistPerfume extends SocialGift {
  id = 'gift_perfume';
  name = 'Star-Mist Perfume';
  description = 'A fragrance that captures the essence of the cosmos. Increases Resonance by 30.';
  basePrice = 2500;
  rarity: Rarity = 'rare';
  emoji = '🧴';
  metadata = { resonanceBonus: 30 };
}

class DigitalMasterpiece extends SocialGift {
  id = 'gift_painting';
  name = 'Digital Masterpiece';
  description = 'A moving canvas of light and sound. Greatly increases Resonance.';
  basePrice = 18000;
  rarity: Rarity = 'epic';
  emoji = '🖼️';
  metadata = { resonanceBonus: 200 };
}

class CyberLute extends SocialGift {
  id = 'gift_instrument';
  name = 'Cyber-Lute';
  description = 'A stringed instrument with holographic overlays. Boosts Bond Score and Resonance.';
  basePrice = 7500;
  rarity: Rarity = 'rare';
  emoji = '🎸';
  metadata = { bondBonus: 30, resonanceBonus: 30 };
}

class HeirloomCrown extends SocialGift {
  id = 'gift_crown';
  name = 'Heirloom Crown';
  description = 'A symbol of ancient authority. Massive boost to Family Reputation and Resonance.';
  basePrice = 75000;
  rarity: Rarity = 'legendary';
  emoji = '👑';
  metadata = { resonanceBonus: 500, reputationBonus: 500 };
}

class GildedStatuette extends SocialGift {
  id = 'gift_statuette';
  name = 'Gilded Statuette';
  description = 'A small but heavy gold statue. Increases Family Reputation significantly.';
  basePrice = 45000;
  rarity: Rarity = 'legendary';
  emoji = '🗿';
  metadata = { reputationBonus: 1000 };
}

class KeyToTheCity extends SocialGift {
  id = 'gift_key';
  name = 'Key to the City';
  description = 'A ceremonial key to a major colony. The ultimate sign of devotion. Max Resonance.';
  basePrice = 150000;
  rarity: Rarity = 'legendary';
  emoji = '🔑';
  metadata = { resonanceBonus: 2500 };
}

export default [
  new EternalRose(), 
  new BioChocolates(), 
  new PlatinumBand(), 
  new HolographicLocket(),
  new FamilySigil(),
  new FriendshipBracelet(),
  new SyntheticWine(),
  new ChronoWatch(),
  new RadiantGemstone(),
  new StarMistPerfume(),
  new DigitalMasterpiece(),
  new CyberLute(),
  new HeirloomCrown(),
  new GildedStatuette(),
  new KeyToTheCity()
];
