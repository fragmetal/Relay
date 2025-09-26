const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');

const createInterface = () => {
    const embed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setDescription('**This interface to manage temporary voice channel.** \n\n' +
                        '♾️ **Limit**: Set a user limit for the voice channel.\n' +
                        '🔒 **Privacy**: Toggle the privacy settings of the channel.\n' +
                        '🚫 **Kick**: Remove a user from the voice channel.\n' +
                        '👑 **Claim**: Claim ownership of the voice channel.\n' +
                        '🔄 **Transfer**: Transfer ownership to another user.\n');

    const buttons = [
        new ButtonBuilder().setCustomId('limit').setLabel('♾️').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('privacy').setLabel('🔒').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('kick').setLabel('🚫').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('claim').setLabel('👑').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('transfer').setLabel('🔄').setStyle(ButtonStyle.Secondary),
    ];

    // Auto split rows (max 5 per row)
    const rows = [];
    for (let i = 0; i < buttons.length; i += 5) {
        rows.push(new ActionRowBuilder().addComponents(buttons.slice(i, i + 5)));
    }

    return { embed, rows };
};

module.exports = createInterface;