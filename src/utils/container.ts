import {
  ActionRowBuilder,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  MessageFlags,
  Routes,
} from 'discord.js';
import { flamebornConfig } from '../config/flameborn.config';

export interface ContainerOptions {
  title?: string;
  description?: string;
  thumbnail?: string;
  image?: string;
  media?: string[];
  fields?: { name: string; value: string; inline?: boolean }[];
  components?: ActionRowBuilder<any>[];
  color?: string | number;
  footer?: string | boolean;
  interaction?: any;
  layout?: 'default' | 'tod' | 'profile'; // Specific layout overrides
}

export async function replyV2(interaction: any, payload: { components: any[] }, ephemeral: boolean = false) {
  if (interaction.token && interaction.applicationId) {
    const flags = ephemeral 
      ? (MessageFlags.IsComponentsV2 as any || 32768) | (MessageFlags.Ephemeral as any || 64) 
      : (MessageFlags.IsComponentsV2 as any || 32768);

    const components = payload.components.map((c: any) => (c.toJSON ? c.toJSON() : c));

    // If not replied, use callback. Otherwise, use webhook patch.
    if (!interaction.replied && !interaction.deferred) {
      await interaction.client.rest.post(
        Routes.interactionCallback(interaction.id, interaction.token),
        { 
          body: {
            type: 4, // ChannelMessageWithSource
            data: { flags, components }
          }
        }
      ).catch((err: any) => {
        console.error('[ContainerService] Interaction Callback Error:', err);
      });
    } else {
      await interaction.client.rest.patch(
        Routes.webhookMessage(interaction.applicationId, interaction.token),
        { body: { flags, components } }
      ).catch((err: any) => {
        if (err.code !== 10015 && err.code !== 10062) {
          console.error('[ContainerService] replyV2 REST Error:', err);
        }
      });
    }
  } else {
    const body = {
      flags: MessageFlags.IsComponentsV2,
      components: payload.components.map((c: any) => (c.toJSON ? c.toJSON() : c)),
      message_reference: interaction.message ? { message_id: interaction.message.id } : undefined,
    };

    try {
      if (interaction.replyMessage) {
        const res: any = await interaction.client.rest.patch(
          Routes.channelMessage(interaction.channel.id, interaction.replyMessage.id),
          { body }
        );
        const fullMsg = await interaction.channel.messages.fetch(res.id || interaction.replyMessage.id).catch(() => null);
        if (fullMsg) interaction.replyMessage = fullMsg;
      } else {
        const res: any = await interaction.client.rest.post(
          Routes.channelMessages(interaction.channel.id),
          { body }
        );
        const fullMsg = await interaction.channel.messages.fetch(res.id).catch(() => null);
        interaction.replyMessage = fullMsg || res;
      }
    } catch (err: any) {
      console.error('[ContainerService] replyV2 Prefix Fallback Error:', err);
      await interaction.editReply(payload).catch(() => {});
    }
  }
}

export async function sendV2(channel: any, payload: { components: any[] }) {
  const body = {
    flags: (MessageFlags.IsComponentsV2 as any || 32768),
    components: payload.components.map((c: any) => (c.toJSON ? c.toJSON() : c)),
  };

  return await channel.client.rest.post(
    Routes.channelMessages(channel.id),
    { body }
  );
}

export class ContainerService {
  private static brandingColor = flamebornConfig.branding.color;

  private static resolveColor(color: string | number): number {
    if (typeof color === 'number') return color;
    if (color && typeof color === 'string' && color.startsWith('#')) {
      return parseInt(color.replace('#', ''), 16);
    }
    return parseInt(this.brandingColor.replace('#', ''), 16);
  }

  private static chunkText(text: string | undefined, maxLength = 2000): TextDisplayBuilder[] {
    if (!text) return [];
    const chunks: TextDisplayBuilder[] = [];
    for (let i = 0; i < text.length; i += maxLength) {
      chunks.push(new TextDisplayBuilder().setContent(text.substring(i, i + maxLength)));
    }
    return chunks;
  }

  static buildCreate(options: ContainerOptions): ContainerBuilder {
    const accentColor = this.resolveColor(options.color || this.brandingColor);
    const container = new ContainerBuilder().setAccentColor(accentColor);

    if (options.layout === 'tod') {
      return this.buildToD(container, options);
    }

    if (options.layout === 'profile') {
      return this.buildProfile(container, options);
    }

    if (options.title && options.title.trim() !== '') {
      container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`## ${options.title}`));
      container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true));
    }

    if (options.description && options.description.trim() !== '') {
      container.addTextDisplayComponents(...this.chunkText(options.description));
    }

    if (options.image || (options.media && options.media.length > 0)) {
      const urls = options.media || [options.image!];
      const validUrls = urls.filter(u => u && typeof u === 'string' && (u.startsWith('http') || u.startsWith('attachment://')));
      if (validUrls.length > 0) {
        const gallery = new MediaGalleryBuilder().addItems(
          validUrls.map(url => new MediaGalleryItemBuilder().setURL(url))
        );
        container.addMediaGalleryComponents(gallery);
      }
    }

    if (options.fields && options.fields.length > 0) {
      container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true));
      options.fields.forEach(field => {
        if (field.name && field.value) {
          container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`**${field.name}**\n${field.value}`)
          );
        }
      });
    }

    if (options.components && options.components.length > 0) {
      container.addActionRowComponents(...options.components);
    }

    if (options.footer) {
      const footerText = typeof options.footer === 'string'
        ? options.footer
        : `${flamebornConfig.branding.footerText || 'Flameborn'} • ${options.interaction?.client?.user?.username || 'System'}`;
      
      if (footerText && footerText.trim() !== '') {
        container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true));
        container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# ${footerText}`));
      }
    }

    return container;
  }

  private static buildToD(container: ContainerBuilder, options: ContainerOptions): ContainerBuilder {
    // 1. Title
    if (options.title && options.title.trim() !== '') {
      container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`## ${options.title}`));
      container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true));
    }

    // 2. Image
    if (options.image || options.media) {
      const urls = options.media || [options.image!];
      const validUrls = urls.filter(u => u && typeof u === 'string' && (u.startsWith('http') || u.startsWith('attachment://')));
      if (validUrls.length > 0) {
        container.addMediaGalleryComponents(new MediaGalleryBuilder().addItems(
          validUrls.map(url => new MediaGalleryItemBuilder().setURL(url))
        ));
        container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true));
      }
    }

    // 3. Question (Description)
    if (options.description && options.description.trim() !== '') {
      container.addTextDisplayComponents(...this.chunkText(options.description));
      container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true));
    }

    // 4. Components (Buttons first, then Select Menu)
    if (options.components && options.components.length > 0) {
      options.components.forEach((row) => {
        container.addActionRowComponents(row);
        container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true));
      });
    }

    // 5. Footer
    if (options.footer) {
      const footerText = typeof options.footer === 'string'
        ? options.footer
        : `${flamebornConfig.branding.footerText || 'Flameborn'} • ${options.interaction?.client?.user?.username || 'System'}`;
      
      if (footerText && footerText.trim() !== '') {
        container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# ${footerText}`));
      }
    }

    return container;
  }

  private static buildProfile(container: ContainerBuilder, options: ContainerOptions): ContainerBuilder {
    // 1. Title: About {user nickname}
    if (options.title && options.title.trim() !== '') {
      container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`## ${options.title}`));
      container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true));
    }

    // 2. Image
    if (options.image || options.media) {
      const urls = options.media || [options.image!];
      const validUrls = urls.filter(u => u && typeof u === 'string' && (u.startsWith('http') || u.startsWith('attachment://')));
      if (validUrls.length > 0) {
        container.addMediaGalleryComponents(new MediaGalleryBuilder().addItems(
          validUrls.map(url => new MediaGalleryItemBuilder().setURL(url))
        ));
        container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true));
      }
    }

    // 3. Title & Bio (Description)
    if (options.description && options.description.trim() !== '') {
      container.addTextDisplayComponents(...this.chunkText(options.description));
      container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true));
    }

    // 4. Next Data (Fields) with separator after each data section!
    if (options.fields && options.fields.length > 0) {
      options.fields.forEach(field => {
        if (field.name && field.value) {
          container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`**${field.name}**\n${field.value}`)
          );
          container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true));
        }
      });
    }

    // 5. Dropdown (Components)
    if (options.components && options.components.length > 0) {
      options.components.forEach((row) => {
        container.addActionRowComponents(row);
        container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true));
      });
    }

    // 6. Footer
    if (options.footer) {
      const footerText = typeof options.footer === 'string'
        ? options.footer
        : `${flamebornConfig.branding.footerText || 'Flameborn'} • ${options.interaction?.client?.user?.username || 'System'}`;
      
      if (footerText && footerText.trim() !== '') {
        container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# ${footerText}`));
      }
    }

    return container;
  }

  static simple(content: string, options: { color?: string | number; withFooter?: boolean; interaction?: any } = {}) {
    const builder = new ContainerBuilder()
      .setAccentColor(this.resolveColor(options.color || this.brandingColor))
      .addTextDisplayComponents(...this.chunkText(content));
    
    if (options.withFooter && options.interaction) {
      builder.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# ${flamebornConfig.branding.footerText}`));
    }
    return { components: [builder] };
  }

  static create(options: ContainerOptions) {
    return { components: [this.buildCreate(options)] };
  }
}
