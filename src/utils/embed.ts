import { EmbedBuilder, ColorResolvable, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { ContainerService } from './container';
import { flamebornConfig } from '../config/flameborn.config';

export class EmbedService {
  private static brandingColor: ColorResolvable = '#7367F0'; // Flameborn Purple/Indigo
  private static errorColor: ColorResolvable = '#EA5455';    // Flameborn Red

  /**
   * Creates a standard branded embed.
   */
  static base(description: string, title?: string) {
    const embed = new EmbedBuilder()
      .setColor(this.brandingColor)
      .setDescription(description);
    
    if (title) embed.setTitle(title);
    return embed;
  }

  /**
   * Creates a standard error embed.
   * Senior Security Pattern: Strips sensitive technical details from user view.
   */
  static error(message: string, code?: string) {
    // Detect if the error is a technical/system error (sensitive keywords)
    const isTechnical = /prisma|database|sql|undefined|null|TypeError|ReferenceError|ENOENT/i.test(message);
    
    // Professional generic message for system failures
    const displayMessage = isTechnical 
      ? "An unexpected system error occurred while processing your request." 
      : message;

    const embed = new EmbedBuilder()
      .setColor(this.errorColor)
      .setTitle('❌ Something went wrong')
      .setDescription(displayMessage)
      .setFooter({ text: `Support ID: ${code || 'ERR-' + Math.random().toString(36).substring(7).toUpperCase()}` })
      .setTimestamp();
    
    return embed;
  }

  /**
   * Creates a success embed.
   */
  static success(message: string) {
    return new EmbedBuilder()
      .setColor('#28C76F')
      .setDescription(`✅ ${message}`);
  }

  /**
   * Creates a container-based error for interactions.
   */
  static containerError(message: string, code?: string) {
    const isTechnical = /prisma|database|sql|undefined|null|TypeError|ReferenceError|ENOENT/i.test(message);
    const displayMessage = isTechnical 
      ? "An unexpected system error occurred while processing your request." 
      : message;
    const supportId = code || 'ERR-' + Math.random().toString(36).substring(7).toUpperCase();

    const components: ActionRowBuilder<ButtonBuilder>[] = [];

    // Add "Contact Support" button if configured
    if (flamebornConfig.support.server) {
      components.push(
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setLabel('Contact Support')
            .setStyle(ButtonStyle.Link)
            .setURL(flamebornConfig.support.server)
        )
      );
    }

    return ContainerService.create({
      title: 'Something went wrong',
      description: displayMessage,
      media: [flamebornConfig.assets.errorBanner],
      color: '#EA5455',
      footer: `Support ID: ${supportId}`,
      components
    });
  }
}
