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
            await player.stopPlaying(true, false); // Stop playing and clear the queue
            const reply = await interaction.reply({ content: 'Stopped the music and cleared the queue.', ephemeral: true });
            setTimeout(() => reply.delete(), 3000);
        } catch (error) {
            const reply = await interaction.reply({ content: 'Error: Unable to stop the music. ' + error.message, ephemeral: true });
            setTimeout(() => reply.delete(), 3000);
        }
    }
}).toJSON();
