const { ButtonInteraction, ModalBuilder, TextInputBuilder, ActionRowBuilder, TextInputStyle, MessageFlags } = require("discord.js");
const DiscordBot = require("../../client/DiscordBot");
const Component = require("../../structure/Component");
const { checkDocument } = require("../../utils/mongodb");

module.exports = new Component({
    customId: 'limit',
    type: 'button',
    /**
     * @param {DiscordBot} client 
     * @param {ButtonInteraction} interaction 
     */
    run: async (client, interaction) => {
        const member = interaction.member;
        const voiceChannel = member.voice.channel;
        
        // Check if user is in a voice channel
        if (!voiceChannel) {
            return interaction.reply({
                content: "❌ You must be in a voice channel to use this button!",
                flags: MessageFlags.Ephemeral
            });
        }
        
        const guildId = interaction.guild.id;
        const settings = await checkDocument('voice_channels', { _id: guildId });
        
        // Check if channel is a temp channel and user is owner
        const isOwner = settings?.temp_channels?.some(
            temp => temp.TempChannel === voiceChannel.id && temp.Owner === member.id
        );
        
        if (!isOwner) {
            return interaction.reply({
                content: "❌ Only the voice channel owner can set user limits!",
                flags: MessageFlags.Ephemeral
            });
        }

        // Create the modal
        const modal = new ModalBuilder()
            .setCustomId('limit-modal')
            .setTitle('Set User Limit');
        
        // Create text input component
        const limitInput = new TextInputBuilder()
            .setCustomId('limit-input')
            .setLabel('Enter limit (0-99)')
            .setPlaceholder('0 = no limit')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMinLength(1)
            .setMaxLength(2);
        
        // Wrap in action row
        const actionRow = new ActionRowBuilder().addComponents(limitInput);
        modal.addComponents(actionRow);
        
        // Show modal
        await interaction.showModal(modal);
    }
}).toJSON();