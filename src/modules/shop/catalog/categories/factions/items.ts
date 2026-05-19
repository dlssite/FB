import { BaseItem } from '../../engine/BaseItem';
import { Rarity } from '../../engine/Types';

export abstract class FactionItem extends BaseItem {
  category = 'factions';
}

class FactionCharter extends FactionItem {
  id = 'faction_charter';
  name = 'Faction Charter';
  description = 'An official document required to establish a new Faction. Using this will launch the Faction Creation Wizard.';
  basePrice = 50000;
  rarity: Rarity = 'legendary';
  emoji = '📜';
  opensModal = true;
  
  async onUse(interaction: any, tenantId: string, guildId: string, userId: string, instance: any): Promise<void> {
    const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = await import('discord.js');
    
    // Create the Faction Setup Wizard Modal
    const modal = new ModalBuilder()
      .setCustomId(`faction_create_wizard_${instance.instanceId}`)
      .setTitle('Faction Creation Wizard');

    const nameInput = new TextInputBuilder()
      .setCustomId('faction_name')
      .setLabel('Faction Name (Max 32 chars)')
      .setStyle(TextInputStyle.Short)
      .setMinLength(3)
      .setMaxLength(32)
      .setRequired(true);

    const mottoInput = new TextInputBuilder()
      .setCustomId('faction_motto')
      .setLabel('Faction Motto or Slogan')
      .setStyle(TextInputStyle.Paragraph)
      .setMaxLength(100)
      .setRequired(false);

    const leaderRoleInput = new TextInputBuilder()
      .setCustomId('faction_leader_role')
      .setLabel('Leader Title (e.g. Grandmaster)')
      .setStyle(TextInputStyle.Short)
      .setMaxLength(20)
      .setRequired(true);

    const memberRoleInput = new TextInputBuilder()
      .setCustomId('faction_member_role')
      .setLabel('Member Title (e.g. Initiate)')
      .setStyle(TextInputStyle.Short)
      .setMaxLength(20)
      .setRequired(true);

    modal.addComponents(
      new ActionRowBuilder<any>().addComponents(nameInput),
      new ActionRowBuilder<any>().addComponents(mottoInput),
      new ActionRowBuilder<any>().addComponents(leaderRoleInput),
      new ActionRowBuilder<any>().addComponents(memberRoleInput)
    );

    await interaction.showModal(modal);
  }
}

abstract class DeployableBuilding extends FactionItem {
  async onUse(interaction: any, tenantId: string, guildId: string, userId: string, instance: any): Promise<void> {
    const { ContainerService, replyV2, sendV2 } = await import('../../../../../utils/container');
    const { FactionService } = await import('../../../../../modules/faction/services/FactionService');
    const { prisma } = await import('../../../../../database/client');



    try {
        const result = await FactionService.deployBuilding(tenantId, guildId, userId, instance, this);
        
        const response = ContainerService.create({
            title: `🏗️ HQ Structure Deployed: ${this.name}`,
            description: `**${this.name}** has been successfully constructed in your Headquarters Territory.\n\n${this.description}`,
            color: '#00FF00',
            interaction,
            footer: true
        });

        await interaction.editReply({ content: '✅ Deployment successful.' });
        
        // Also announce it to the channel since it's a major event
        await sendV2(interaction.channel, response);
    } catch (err: any) {
        await interaction.editReply({ content: `❌ **Deployment Failed:** ${err.message}` });
    }
  }
}

class SyndicateBarracks extends DeployableBuilding {
  id = 'faction_bld_barracks';
  name = 'Syndicate Barracks';
  description = 'A sprawling housing complex for your recruits. Permanently increases Faction Member Capacity by +15 when deployed to your HQ.';
  basePrice = 150000;
  rarity: Rarity = 'epic';
  emoji = '⛺';
}

class PrismiteRefinery extends DeployableBuilding {
  id = 'faction_bld_refinery';
  name = 'Prismite Refinery';
  description = 'An automated resource extractor. Grants a daily Ember dividend to the Faction Bank when deployed to your HQ.';
  basePrice = 250000;
  rarity: Rarity = 'legendary';
  emoji = '🏭';
}

class OrbitalShieldGenerator extends DeployableBuilding {
  id = 'faction_bld_shield';
  name = 'Orbital Shield Generator';
  description = 'A massive energy dome protecting your assets. Reduces Embers lost during a Rivalry Skirmish raid by 50%.';
  basePrice = 400000;
  rarity: Rarity = 'legendary';
  emoji = '🛡️';
}

export default [
  new FactionCharter(),
  new SyndicateBarracks(),
  new PrismiteRefinery(),
  new OrbitalShieldGenerator()
];
