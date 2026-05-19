import { 
  SlashCommandSubcommandBuilder, 
  ChatInputCommandInteraction, 
  StringSelectMenuBuilder, 
  StringSelectMenuOptionBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle 
} from 'discord.js';
import fs from 'node:fs';
import path from 'node:path';
import { Translator } from '../../../../core/Translator';
import { tenantStorage } from '../../../../utils/context';
import { ContainerService, replyV2 } from '../../../../utils/container';
import { flamebornConfig } from '../../../../config/flameborn.config';

export default {
  data: (sub: SlashCommandSubcommandBuilder) =>
    sub.setName('help')
      .setDescription('Opens the interactive Command Atlas'),
      
  async execute(interaction: ChatInputCommandInteraction) {
    const docsDir = path.join(process.cwd(), 'docs', 'commands');
    const ctx = tenantStorage.getStore();
    const lang = ctx?.lang || 'en';
    
    // 1. Get available categories (based on .md files)
    const categories = fs.readdirSync(docsDir)
      .filter(f => f.endsWith('.md'))
      .map(f => f.replace('.md', ''));

    let currentPage = 0;
    const totalPages = Math.ceil(categories.length / 25);
    let selectedCategory: string | null = null;

    // Helper to generate components for the current page
    const getComponents = (page: number) => {
      const paginatedCategories = categories.slice(page * 25, (page + 1) * 25);
      const select = new StringSelectMenuBuilder()
        .setCustomId(`help_category_${page}`)
        .setPlaceholder(`Select a module (Page ${page + 1}/${totalPages})...`)
        .addOptions(
          paginatedCategories.map(cat => {
            const modConfig = (flamebornConfig.modules as any)[cat.toLowerCase()];
            return new StringSelectMenuOptionBuilder()
              .setLabel(modConfig?.name || cat.charAt(0).toUpperCase() + cat.slice(1))
              .setValue(cat)
              .setEmoji(modConfig?.emoji || '📦');
          })
        );

      const rows: any[] = [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select)];

      if (totalPages > 1) {
        const btnRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId(`help_prev`)
            .setLabel('◀ Previous')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page === 0),
          new ButtonBuilder()
            .setCustomId(`help_next`)
            .setLabel('Next ▶')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page === totalPages - 1)
        );
        rows.push(btnRow);
      }
      return rows;
    };

    // Helper to generate the container payload
    const getContainer = (showComponents: boolean = true) => {
      const components = showComponents ? getComponents(currentPage) : [];
      if (selectedCategory) {
        const filePath = path.join(docsDir, `${selectedCategory}.md`);
        if (fs.existsSync(filePath)) {
          let content = fs.readFileSync(filePath, 'utf-8');
          content = content.replace(/{{botName}}/g, interaction.client.user.username);
          
          return ContainerService.create({
            title: Translator.t('utility', 'help.guide_title', lang, { category: selectedCategory.toUpperCase() }),
            description: content,
            color: '#7367F0',
            interaction,
            components,
            footer: true
          });
        }
      }

      // Default Main Overview Container
      return ContainerService.create({
        title: Translator.t('utility', 'help.title', lang, { botName: interaction.client.user.username }),
        description: Translator.t('utility', 'help.desc', lang),
        fields: [{ name: Translator.t('utility', 'help.categories', lang), value: categories.map(c => {
          const modConfig = (flamebornConfig.modules as any)[c.toLowerCase()];
          return `${modConfig?.emoji || '•'} ${modConfig?.name || c.charAt(0).toUpperCase() + c.slice(1)}`;
        }).join('\n') }],
        color: flamebornConfig.branding.color,
        thumbnail: flamebornConfig.branding.logoUrl,
        media: [flamebornConfig.assets.helpBanner],
        footer: Translator.t('utility', 'help.footer', lang),
        interaction,
        components
      });
    };

    // Use replyV2 to bypass discord.js Type 1 validation for V2 Containers
    await replyV2(interaction, getContainer());
    const response = await interaction.fetchReply();

    // 3. Collector for Interactions (collects both Select Menus and Buttons)
    const collector = response.createMessageComponentCollector({
      time: flamebornConfig.behavior.collectorTimeout
    });

    collector.on('collect', async (i: any) => {
      if (i.user.id !== interaction.user.id) {
        return i.reply({ content: Translator.t('utility', 'help.not_for_you', lang), flags: [64] as any });
      }

      // Defer update to acknowledge the button/select menu click
      try { await i.deferUpdate(); } catch (e) { return; }

      if (i.isButton()) {
        if (i.customId === 'help_prev' && currentPage > 0) {
          currentPage--;
        } else if (i.customId === 'help_next' && currentPage < totalPages - 1) {
          currentPage++;
        }
      } else if (i.isStringSelectMenu() && i.customId.startsWith('help_category_')) {
        selectedCategory = i.values[0];
      }

      // Use replyV2 to patch the webhook message with the new V2 Container
      await replyV2(i, getContainer());
    });

    collector.on('end', async () => {
      // Disable all components on timeout using replyV2
      await replyV2(interaction, getContainer(false)).catch(() => {});
    });
  },
};
