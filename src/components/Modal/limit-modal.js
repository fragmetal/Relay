const { 
    ModalSubmitInteraction, 
    PermissionFlagsBits, 
    MessageFlags 
} = require("discord.js");
const DiscordBot = require("../../client/DiscordBot");
const Component = require("../../structure/Component");

module.exports = new Component({
    customId: 'limit-modal',
    type: 'modal',
    /**
     * @param {DiscordBot} client 
     * @param {ModalSubmitInteraction} interaction 
     */
    run: async (client, interaction) => {
        try {
            const member = interaction.member;
            const voiceChannel = member.voice.channel;

            // Get and validate input
            const input = interaction.fields.getTextInputValue('limit-input');
            const limit = parseInt(input, 10);

            if (isNaN(limit) || limit < 0 || limit > 99) {
                return await interaction.reply({
                    content: '❌ Invalid input! Please enter a number between 0–99.',
                    flags: [MessageFlags.Ephemeral]
                });
            }

            // Check if user is still in VC
            if (!voiceChannel) {
                return await interaction.reply({
                    content: "❌ You must be in a voice channel to set limits!",
                    flags: [MessageFlags.Ephemeral]
                });
            }

            // Check bot permissions
            const botPermissions = voiceChannel.permissionsFor(interaction.guild.members.me);
            if (!botPermissions?.has(PermissionFlagsBits.ManageChannels)) {
                return await interaction.reply({
                    content: "❌ I don't have permission to manage this channel!",
                    flags: [MessageFlags.Ephemeral]
                });
            }

            // Apply new limit
            await voiceChannel.setUserLimit(limit);

            const message = limit === 0
                ? "✅ User limit removed (no limit)."
                : `✅ User limit set to: **${limit}**`;

            await interaction.reply({
                content: message,
                flags: [MessageFlags.Ephemeral]
            });

        } catch (error) {
            console.error("Error setting channel limit:", error);

            // Fail-safe: only reply if not already done
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: "❌ Failed to set user limit!",
                    flags: [MessageFlags.Ephemeral]
                });
            }
        }
    }
}).toJSON();
