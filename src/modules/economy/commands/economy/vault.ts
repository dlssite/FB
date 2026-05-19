import { SlashCommandSubcommandGroupBuilder, ChatInputCommandInteraction, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ComponentType } from 'discord.js';
import { VaultService } from '../../services/VaultService';
import { EconomyRepository } from '../../database/EconomyRepository';
import { ContainerService, replyV2 } from '../../../../utils/container';
import { tenantStorage } from '../../../../utils/context';
import { flamebornConfig } from '../../../../config/flameborn.config';
import { Translator } from '../../../../core/Translator';

export default {
  isGroup: true,
  data: (sub: SlashCommandSubcommandGroupBuilder) =>
    sub.setName('vault')
       .setDescription('🏦 Access the central banking system.')
       .addSubcommand(sub => 
         sub.setName('deposit')
            .setDescription('📥 Deposit embers into your vault.')
            .addIntegerOption(opt => opt.setName('amount').setDescription('Amount to deposit').setRequired(true).setMinValue(1))
       )
       .addSubcommand(sub => 
         sub.setName('withdraw')
            .setDescription('📤 Withdraw embers from your vault.')
            .addIntegerOption(opt => opt.setName('amount').setDescription('Amount to withdraw').setRequired(true).setMinValue(1))
       )
       .addSubcommand(sub => 
         sub.setName('manage')
            .setDescription('⚙️ Change your vault type and view perks.')
       ),

  async execute(interaction: ChatInputCommandInteraction) {
    const context = tenantStorage.getStore();
    if (!context) return;
    const lang = context.lang || 'en';

    const user = await EconomyRepository.getUser(context.tenantId, interaction.user.id);
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'deposit') {
      const amount = interaction.options.getInteger('amount', true);
      const result = await VaultService.deposit(context.tenantId, interaction.user.id, amount);
      
      if (!result.success) {
        return await replyV2(interaction, ContainerService.simple(`❌ ${result.message}`));
      }

      const vaultName = Translator.t('economy', `vault.types.${user?.bankType || 'prism_ledger'}.name`, lang);

      const embed = ContainerService.create({
        title: Translator.t('economy', 'vault.title_deposit', lang),
        description: Translator.t('economy', 'vault.desc_deposit', lang, { amount: result.amount?.toLocaleString(), vault: vaultName }),
        image: VaultService.getVault(user?.bankType || 'prism_ledger').banner,
        fields: [
          { name: Translator.t('economy', 'vault.fee', lang), value: `\`${result.fee?.toLocaleString()} 💠\``, inline: true }
        ],
        color: '#28C76F',
        footer: true,
        interaction
      });
      return await replyV2(interaction, embed);
    }

    if (subcommand === 'withdraw') {
      const amount = interaction.options.getInteger('amount', true);
      const result = await VaultService.withdraw(context.tenantId, interaction.user.id, amount);
      
      if (!result.success) {
        return await replyV2(interaction, ContainerService.simple(`❌ ${result.message}`));
      }

      const vaultName = Translator.t('economy', `vault.types.${user?.bankType || 'prism_ledger'}.name`, lang);

      const embed = ContainerService.create({
        title: Translator.t('economy', 'vault.title_withdraw', lang),
        description: Translator.t('economy', 'vault.desc_withdraw', lang, { amount: result.amount?.toLocaleString(), vault: vaultName }),
        image: VaultService.getVault(user?.bankType || 'prism_ledger').banner,
        fields: [
          { name: Translator.t('economy', 'vault.fee', lang), value: `\`${result.fee?.toLocaleString()} 💠\``, inline: true }
        ],
        color: '#28C76F',
        footer: true,
        interaction
      });
      return await replyV2(interaction, embed);
    }

    if (subcommand === 'manage') {
      const currentVaultId = user?.bankType || 'prism_ledger';
      const vaults = Object.values(VaultService.vaults);

      const select = new StringSelectMenuBuilder()
        .setCustomId('vault_select')
        .setPlaceholder(Translator.t('economy', 'vault.placeholder', lang))
        .addOptions(
          vaults.map(v => 
            new StringSelectMenuOptionBuilder()
              .setLabel(Translator.t('economy', `vault.types.${v.id}.name`, lang))
              .setDescription(Translator.t('economy', `vault.types.${v.id}.desc`, lang))
              .setValue(v.id)
              .setDefault(v.id === currentVaultId)
          )
        );

      const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);

      const currentVaultName = Translator.t('economy', `vault.types.${currentVaultId}.name`, lang);

      const embed = ContainerService.create({
        title: Translator.t('economy', 'vault.title_manage', lang),
        description: Translator.t('economy', 'vault.desc_manage', lang, { vault: currentVaultName }),
        image: VaultService.getVault(user?.bankType || 'prism_ledger').banner,
        fields: vaults.map(v => ({
          name: Translator.t('economy', `vault.types.${v.id}.name`, lang),
          value: `${Translator.t('economy', `vault.types.${v.id}.desc`, lang)}\n• ${Translator.t('economy', 'vault.interest_label', lang)}: \`${(v.interestRate * 100).toFixed(1)}%/day\`\n• ${Translator.t('economy', 'vault.fees_label', lang)}: \`D: ${(v.depositFee * 100)}% / W: ${(v.withdrawFee * 100)}%\``,
          inline: false
        })),
        color: '#7367F0',
        interaction,
        footer: true,
        components: [row]
      });

      await replyV2(interaction, embed);
      const response = await interaction.fetchReply();

      const collector = response.createMessageComponentCollector({
        componentType: ComponentType.StringSelect,
        time: 60000
      });

      collector.on('collect', async (i) => {
        if (i.user.id !== interaction.user.id) return;
        await i.deferUpdate().catch(() => {});

        const selectedId = i.values[0];
        const vaultData = VaultService.getVault(selectedId);
        const vaultName = Translator.t('economy', `vault.types.${selectedId}.name`, lang);
        const vaultDesc = Translator.t('economy', `vault.types.${selectedId}.desc`, lang);

        await EconomyRepository.updateVaultType(context.tenantId, interaction.user.id, selectedId);

        const success = ContainerService.create({
          title: Translator.t('economy', 'vault.title_updated', lang),
          description: Translator.t('economy', 'vault.desc_updated', lang, { vault: vaultName, description: vaultDesc }),
          image: vaultData.banner,
          color: '#28C76F',
          interaction: i,
          footer: true
        });

        await replyV2(interaction, success);
      });
    }
  }
};
