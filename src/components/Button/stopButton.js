const { ButtonInteraction } = require("discord.js");
const DiscordBot = require("../../client/DiscordBot");
const Component = require("../../structure/Component");

module.exports = new Component({
    customId: 'stop-button', // Custom ID for the button
    type: 'button',
    /**
     * 
     * @param {DiscordBot} client 
     * @param {ButtonInteraction} interaction 
     */
    run: async (client, interaction) => {
        const player = client.lavalink.getPlayer(interaction.guildId); // Get the Lavalink player

        if (!player) {
            const reply = await interaction.reply({ content: 'No player found for this guild.', ephemeral: true });
            return setTimeout(() => reply.delete(), 3000);
        }

        try {
            await player.stopPlaying(true, true); // Stop playing and clear the queue
            await interaction.update({ content: '✅ Stopped the music and cleared the queue.', ephemeral: true });
        } catch (error) {
            await interaction.update({ content: '❌ Error: Unable to stop the music. ' + error.message, ephemeral: true });
        }
    }
}).toJSON();
