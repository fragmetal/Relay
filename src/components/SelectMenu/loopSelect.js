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

        const player = client.lavalink.getPlayer(interaction.guildId);
        if (!player) {
            const reply = await interaction.reply({ content: 'No player found for this guild.', components: [], ephemeral: true });
            return setTimeout(() => reply.delete(), 3000);
        }

        const selectedValue = interaction.values[0];

        if (selectedValue === 'track') {
            try {
                await player.setRepeatMode('track');
                const reply = await interaction.update({
                    content: 'Looping is now **enabled** for the current track!',
                    components: [],
                    ephemeral: true,
                });
                setTimeout(() => reply.delete(), 3000);
                
            } catch (error) {
                const reply = await interaction.update({
                    content: 'Error: Unable to enable track repeat. ' + error.message,
                    components: [],
                    ephemeral: true,
                });
                setTimeout(() => reply.delete(), 3000);
            }
        } else if (selectedValue === 'queue') {
            try {
                await player.setRepeatMode('queue');
                const reply = await interaction.update({
                    content: 'Looping is now **enabled** for the entire queue!',
                    components: [],
                    ephemeral: true,
                });
                setTimeout(() => reply.delete(), 3000);
            } catch (error) {
                await interaction.update({
                    content: 'Error: Unable to toggle queue repeat. ' + error.message,
                    components: [],
                    ephemeral: true,
                });
                
            }
        } else if (selectedValue === 'off') {
            try {
                await player.setRepeatMode('off');
                const reply = await interaction.update({
                    content: 'Looping has been **disabled**.',
                    components: [],
                    ephemeral: true,
                });
                setTimeout(() => reply.delete(), 3000);
                
            } catch (error) {
                const reply = await interaction.update({
                    content: 'Error: Unable to disable looping. ' + error.message,
                    components: [],
                    ephemeral: true,
                });
                setTimeout(() => reply.delete(), 3000);
            }
        } else {
            const reply = await interaction.reply({
                content: 'Invalid selection.',
                components: [],
                ephemeral: true,
            });
            setTimeout(() => reply.delete(), 3000);
        }
    }
}).toJSON(); 