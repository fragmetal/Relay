const { ModalSubmitInteraction, PermissionFlagsBits, MessageFlags } = require("discord.js");
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
        const member = interaction.member;
        const voiceChannel = member.voice.channel;
        
        // Get input value
        const input = interaction.fields.getTextInputValue('limit-input');
        const limit = parseInt(input);
        
        // Validate input
        if (isNaN(limit) || limit < 0 || limit > 99) {
            return interaction.reply({
                content: '❌ Invalid input! Please enter a number between 0-99',
                flags: MessageFlags.Ephemeral
            });
        }
        
        // Check if user is still in a voice channel
        if (!voiceChannel) {
            return interaction.reply({
                content: "❌ You must be in a voice channel to set limits!",
                flags: MessageFlags.Ephemeral
            });
        }
        
        // Check bot permissions
        const botPermissions = voiceChannel.permissionsFor(interaction.guild.members.me);
        if (!botPermissions.has(PermissionFlagsBits.ManageChannels)) {
            return interaction.reply({
                content: "❌ I don't have permission to manage this channel!",
                flags: MessageFlags.Ephemeral
            });
        }
        
        try {
            // Update channel limit
            await voiceChannel.setUserLimit(limit);
            
            const message = limit === 0 
                ? '✅ User limit removed (no limit)' 
                : `✅ User limit set to: ${limit}`;
            
            await interaction.reply({
                content: message,
                flags: MessageFlags.Ephemeral
            });
        } catch (error) {
            console.error('Error setting channel limit:', error);
            await interaction.reply({
                content: '❌ Failed to set user limit!',
                flags: MessageFlags.Ephemeral
            });
        }
    }
}).toJSON();