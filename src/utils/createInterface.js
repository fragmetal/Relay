const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');

const createInterface = async (channel) => {
    try {
        if (!channel.isTextBased()) {
            throw new Error('Channel is not a text-based channel');
        }

        const embed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setDescription('**This interface to manage temporary voice channel.** \n\n' +
                            '♾️ **Limit**: Set a user limit for the voice channel.\n' +
                            '🔒 **Privacy**: Toggle the privacy settings of the channel.\n' +
                            '📩 **Invite**: Send an invite link to the channel.\n' +
                            '🚫 **Kick**: Remove a user from the voice channel.\n' +
                            '👑 **Claim**: Claim ownership of the voice channel.\n' +
                            '🔄 **Transfer**: Transfer ownership to another user.\n');

        const row1 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('limit').setLabel('♾️').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('privacy').setLabel('🔒').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('invite').setLabel('📩').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('kick').setLabel('🚫').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('claim').setLabel('👑').setStyle(ButtonStyle.Secondary)
        );

        const row2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('transfer').setLabel('🔄').setStyle(ButtonStyle.Secondary)
        );

        const messages = await channel.messages.fetch({ limit: 10 });
        const existingMessage = messages.find(msg => 
            msg.embeds.length > 0 && 
            msg.embeds[0].color === embed.data.color &&
            msg.components.length === 2 && // Ensure there are two rows
            msg.components[0].components.length === row1.components.length &&
            msg.components[1].components.length === row2.components.length
        );

        if (existingMessage) {
            const isIdentical = existingMessage.embeds[0].color === embed.data.color &&
                                existingMessage.components.length === 2 &&
                                existingMessage.components[0].components.length === row1.components.length &&
                                existingMessage.components[1].components.length === row2.components.length &&
                                existingMessage.components[0].components.every((button, index) => 
                                    button.customId === row1.components[index].data.custom_id &&
                                    button.label === row1.components[index].data.label &&
                                    button.style === row1.components[index].data.style
                                ) &&
                                existingMessage.components[1].components.every((button, index) => 
                                    button.customId === row2.components[index].data.custom_id &&
                                    button.label === row2.components[index].data.label &&
                                    button.style === row2.components[index].data.style
                                );

            // Check if the description is similar (allowing for minor changes)
            const isDescriptionSimilar = existingMessage.embeds[0].description.trim().includes(embed.data.description.trim());

            if (isIdentical && isDescriptionSimilar) {
                // console.log(`No changes detected in the interface for channel: ${channel.id}`);
                return; // Exit if no changes
            }

            await existingMessage.edit({ embeds: [embed], components: [row1, row2] });
            // console.log(`Edited existing interface in channel: ${channel.id}`);
        } else {
            await channel.send({ embeds: [embed], components: [row1, row2] });
            // console.log(`Created new interface in channel: ${channel.id}`);
        }
    } catch (error) {
        console.error('Error in createInterface:', error);
    }
};

module.exports = createInterface;
