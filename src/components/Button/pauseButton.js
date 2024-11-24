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
            const reply = await interaction.reply({ content: 'You need to be in a voice channel to pause or unpause a track!', ephemeral: true });
            setTimeout(() => reply.delete(), 3000);
            return;
        }

        if (player.paused) {
            await player.resume();
            await interaction.update({ content: '✅ Track resumed!', ephemeral: true });
        } else {
            await player.pause();
            await interaction.update({ content: '✅ Track paused!', ephemeral: true });
        }
    }
}).toJSON();
