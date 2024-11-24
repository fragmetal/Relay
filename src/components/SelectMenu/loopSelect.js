const DiscordBot = require("../../client/DiscordBot");
const Component = require("../../structure/Component");

module.exports = new Component({
    customId: 'loop-select',
    type: 'select',
    /**
     * 
     * @param {DiscordBot} client 
     * @param {import("discord.js").AnySelectMenuInteraction} interaction 
     */
    run: async (client, interaction) => {
        // Get the interaction ID for the user from the loop selections
        const interactionId = client.loopSelections.get(interaction.user.id);

        // Optional: Check if the interaction ID is valid
        if (!interactionId) {
            return await interaction.reply({ content: 'No active loop selection found for you.', ephemeral: true });
        }

        const player = client.lavalink.getPlayer(interaction.guildId);

        if (!player) {
            return await interaction.followUp({ content: 'No player found for this guild.', ephemeral: true });
        }

        const selectedValue = interaction.values[0];

        if (selectedValue === 'track') {
            try {
                await player.setRepeatMode(player.repeatMode === 'track' ? 'off' : 'track');
                await interaction.followUp({
                    content: `Looping is now **${player.repeatMode === 'track' ? 'enabled' : 'disabled'}** for the current track!`,
                    ephemeral: true,
                });
            } catch (error) {
                await interaction.followUp({
                    content: 'Error: Unable to toggle track repeat. ' + error.message,
                    ephemeral: true,
                });
            }
        } else if (selectedValue === 'queue') {
            try {
                await player.setRepeatMode(player.repeatMode === 'queue' ? 'off' : 'queue');
                await interaction.followUp({
                    content: `Looping is now **${player.repeatMode === 'queue' ? 'enabled' : 'disabled'}** for the entire queue!`,
                    ephemeral: true,
                });
            } catch (error) {
                await interaction.followUp({
                    content: 'Error: Unable to toggle queue repeat. ' + error.message,
                    ephemeral: true,
                });
            }
        } else if (selectedValue === 'off') {
            try {
                await player.setRepeatMode('off');
                await interaction.followUp({
                    content: 'Looping has been **disabled**.',
                    ephemeral: true,
                });
            } catch (error) {
                await interaction.followUp({
                    content: 'Error: Unable to disable looping. ' + error.message,
                    ephemeral: true,
                });
            }
        } else {
            await interaction.followUp({
                content: 'Invalid selection.',
                ephemeral: true,
            });
        }
    }
}).toJSON(); 