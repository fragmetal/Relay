const { ButtonInteraction } = require("discord.js");
const DiscordBot = require("../../client/DiscordBot");
const Component = require("../../structure/Component");

module.exports = new Component({
    customId: 'song_skip',
    type: 'button',
    /**
     * 
     * @param {DiscordBot} client 
     * @param {ButtonInteraction} interaction 
     */
    run: async (client, interaction) => {
        const player = client.lavalink.getPlayer(interaction.guildId);
        if (!player) {
            const reply = await interaction.reply({ content: 'No player found for this guild.', ephemeral: true });
            return setTimeout(() => reply.delete(), 3000);
        }

        const voiceChannel = interaction.member.voice.channel;
        if (!voiceChannel) {
            const reply = await interaction.reply({ content: 'You need to be in a voice channel to skip a track!', ephemeral: true });
            return setTimeout(() => reply.delete(), 3000);
        }

        const currentTrack = player.queue.current;
        if (!currentTrack) {
            const reply = await interaction.reply({ content: 'No track is currently playing.', ephemeral: true });
            return setTimeout(() => reply.delete(), 3000);
        }

        const requesterId = currentTrack?.requester?.id;
        const userId = interaction.user.id;

        if (userId === requesterId) {
            await player.skip(0, true);
            await interaction.update({ content: '✅ Track skipped!', ephemeral: true });
            return;
        }

        const members = voiceChannel.members.filter(member => !member.user.bot);
        const requiredVotes = Math.ceil(members.size / 2);
        const skipVotes = client.skipVotes || new Map();

        if (!skipVotes.has(interaction.guildId)) {
            skipVotes.set(interaction.guildId, new Set());
        }

        const userVotes = skipVotes.get(interaction.guildId);

        if (userVotes.has(userId)) {
            const reply = await interaction.reply({ content: 'You have already voted to skip this track!', ephemeral: true });
            return setTimeout(() => reply.delete(), 3000);
        }

        userVotes.add(userId);

        if (userVotes.size >= requiredVotes) {
            await player.skip(0, true);
            await interaction.update({ content: '✅ Track skipped!', ephemeral: true });
            skipVotes.delete(interaction.guildId);
            return;
        } else {
            await interaction.update({ content: `You have voted to skip the track! ${userVotes.size}/${requiredVotes} votes.`, ephemeral: true });
        }

        client.skipVotes = skipVotes;
    }
}).toJSON();