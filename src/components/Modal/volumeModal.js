const { ModalSubmitInteraction } = require("discord.js");
const DiscordBot = require("../../client/DiscordBot");
const Component = require("../../structure/Component");

module.exports = new Component({
    customId: 'volume-modal',
    type: 'modal',
    /**
     * 
     * @param {DiscordBot} client 
     * @param {ModalSubmitInteraction} interaction 
     */
    run: async (client, interaction) => {
        const volumeInput = interaction.fields.getTextInputValue('volume-input');

        const volume = parseFloat(volumeInput);

        if (isNaN(volume) || volume < 0 || volume > 100) {
            return await interaction.reply({
                content: 'Please enter a valid volume between 0 and 100.',
                ephemeral: true
            });
        }

        const player = client.lavalink.getPlayer(interaction.guildId);

        if (!player) {
            return await interaction.reply({
                content: 'No player found for this guild.',
                ephemeral: true
            });
        }

        // Set the volume directly to the input value, ignoring the volume decrementer
        await player.setVolume(volume, true);

        const reply = await interaction.reply({
            content: `Volume has been set to **${volume}**%.`,
            ephemeral: true
        });
        setTimeout(() => reply.delete(), 3000);
    }
}).toJSON(); 