const { ButtonInteraction } = require("discord.js");
const DiscordBot = require("../../client/DiscordBot");
const Component = require("../../structure/Component");

module.exports = new Component({
    customId: 'song_pause',
    type: 'button',
    /**
     * 
     * @param {DiscordBot} client 
     * @param {ButtonInteraction} interaction 
     */
    run: async (client, interaction) => {
        const player = client.lavalink.getPlayer(interaction.guildId);
        const voiceChannel = interaction.member.voice.channel;
        if (!voiceChannel) {
            return await interaction.reply({ content: 'You need to be in a voice channel to pause or unpause a track!', ephemeral: true });
        }

        if (player.paused) {
            await player.resume();
            const reply = await interaction.reply({ content: 'Track resumed!', ephemeral: true });
            setTimeout(() => reply.delete(), 1000);
        } else {
            await player.pause();
            const reply = await interaction.reply({ content: 'Track paused!', ephemeral: true });
            setTimeout(() => reply.delete(), 1000);
        }
    }
}).toJSON();
