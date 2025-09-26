const { 
    MessageFlags,
    ButtonInteraction, 
    ModalBuilder, 
    TextInputBuilder, 
    ActionRowBuilder, 
    TextInputStyle 
} = require("discord.js");
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
            const member = interaction.member;
            const voiceChannel = member.voice.channel;

            if (!voiceChannel) {
                return await interaction.reply({
                    content: "❌ You must be in a voice channel to use this button!",
                    flags: MessageFlags.Ephemeral
                });
            }

            const guildId = interaction.guild.id;
            const settings = await checkDocument('voice_channels', { _id: guildId });

            if (!settings?.temp_channels) {
                return await interaction.reply({
                    content: "❌ No temporary voice channels configured!",
                    flags: MessageFlags.Ephemeral
                });
            }

            const isOwner = settings.temp_channels.some(
                temp => temp.TempChannel === voiceChannel.id && temp.Owner === member.id
            );

            if (!isOwner) {
                return await interaction.reply({
                    content: "❌ Only the voice channel owner can set user limits!",
                    flags: MessageFlags.Ephemeral
                });
            }

            // ✅ Do NOT deferReply here
            // Directly show the modal
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

            modal.addComponents(new ActionRowBuilder().addComponents(limitInput));

            await interaction.showModal(modal);

        } catch (error) {
            console.error("Error in limit button:", error);

            // Only reply if not already handled
            if (!interaction.replied && !interaction.deferred) {
                try {
                    await interaction.reply({
                        content: "❌ An unexpected error occurred while opening the modal!",
                        flags: MessageFlags.Ephemeral
                    });
                } catch (finalError) {
                    if (finalError.code !== 10062) {
                        console.log("Could not send error message:", finalError.message);
                    }
                }
            }
        }
    }
}).toJSON();
