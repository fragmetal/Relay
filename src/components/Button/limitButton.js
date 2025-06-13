const { ButtonInteraction, ModalBuilder, TextInputBuilder, ActionRowBuilder, TextInputStyle, DiscordAPIError, MessageFlags } = require("discord.js");
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
        try {
            // Immediately defer to prevent token expiration
            await interaction.deferReply({ ephemeral: true, flags: MessageFlags.Ephemeral });
            
            const member = interaction.member;
            const voiceChannel = member.voice.channel;
            
            if (!voiceChannel) {
                return await interaction.editReply({
                    content: "❌ You must be in a voice channel to use this button!",
                });
            }
            
            const guildId = interaction.guild.id;
            const settings = await checkDocument('voice_channels', { _id: guildId });
            
            if (!settings?.temp_channels) {
                return await interaction.editReply({
                    content: "❌ No temporary voice channels configured!",
                });
            }
            
            const isOwner = settings.temp_channels.some(
                temp => temp.TempChannel === voiceChannel.id && temp.Owner === member.id
            );
            
            if (!isOwner) {
                return await interaction.editReply({
                    content: "❌ Only the voice channel owner can set user limits!",
                });
            }

            // Create modal
            const modal = new ModalBuilder()
                .setCustomId('limit-modal')
                .setTitle('Set User Limit');
            
            const limitInput = new TextInputBuilder()
                .setCustomId('limit-input')
                .setLabel('Enter limit (0-99)')
                .setPlaceholder('0 = no limit')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setMinLength(1)
                .setMaxLength(2);
            
            const actionRow = new ActionRowBuilder().addComponents(limitInput);
            modal.addComponents(actionRow);
            
            // Show modal and clean up deferred message
            await interaction.showModal(modal);
            await interaction.deleteReply();
            
        } catch (error) {
            // Handle expired interactions gracefully
            if (error.code === 10062 || error.message.includes('Unknown interaction')) {
                //console.log('Interaction expired - safe to ignore');
                return;
            }
            
            console.error('Error in limit button:', error);
            
            // Attempt to send error message only if interaction is still valid
            try {
                await interaction.editReply({
                    content: "❌ An unexpected error occurred!",
                });
            } catch (finalError) {
                console.log('Could not send error message:', finalError.message);
            }
        }
    }
}).toJSON();