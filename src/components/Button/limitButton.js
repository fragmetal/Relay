const { ButtonInteraction, ModalBuilder, TextInputBuilder, ActionRowBuilder, TextInputStyle, DiscordAPIError } = require("discord.js");
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
        // Helper function to handle interaction responses safely
        const safeRespond = async (responseFn, ...args) => {
            try {
                await responseFn(...args);
                return true;
            } catch (error) {
                if (error instanceof DiscordAPIError && error.code === 10062) {
                    console.log('Ignoring expired interaction');
                    return false;
                }
                throw error;
            }
        };

        try {
            // Check if interaction is still valid
            if (interaction.responded || interaction.replied) return;
            
            const member = interaction.member;
            const voiceChannel = member.voice.channel;
            
            if (!voiceChannel) {
                return await safeRespond(
                    interaction.reply.bind(interaction), 
                    {
                        content: "❌ You must be in a voice channel to use this button!",
                        ephemeral: true
                    }
                );
            }
            
            const guildId = interaction.guild.id;
            const settings = await checkDocument('voice_channels', { _id: guildId });
            
            if (!settings?.temp_channels) {
                return await safeRespond(
                    interaction.reply.bind(interaction),
                    {
                        content: "❌ No temporary voice channels configured!",
                        ephemeral: true
                    }
                );
            }
            
            const isOwner = settings.temp_channels.some(
                temp => temp.TempChannel === voiceChannel.id && temp.Owner === member.id
            );
            
            if (!isOwner) {
                return await safeRespond(
                    interaction.reply.bind(interaction),
                    {
                        content: "❌ Only the voice channel owner can set user limits!",
                        ephemeral: true
                    }
                );
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
            
            // Show modal with safety check
            await safeRespond(interaction.showModal.bind(interaction), modal);
            
        } catch (error) {
            if (error instanceof DiscordAPIError && error.code === 10062) {
                console.log('Interaction expired before processing');
            } else {
                console.error('Unexpected error in limit button:', error);
                await safeRespond(
                    interaction.reply.bind(interaction),
                    {
                        content: "❌ An unexpected error occurred!",
                        ephemeral: true
                    }
                );
            }
        }
    }
}).toJSON();