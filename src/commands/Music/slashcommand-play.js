const { ChatInputCommandInteraction, ApplicationCommandOptionType } = require("discord.js");
const DiscordBot = require("../../client/DiscordBot");
const ApplicationCommand = require("../../structure/ApplicationCommand");

module.exports = new ApplicationCommand({
    command: {
        name: 'play',
        description: 'Play a song from a given search term or URL.',
        type: 1,
        options: [
            {
                name: 'search',
                description: 'What to play? Paste the link or search',
                type: ApplicationCommandOptionType.String,
                required: false,
                autocomplete: true
            },
            {
                name: 'playlist',
                description: 'Paste the playlist URL to play it directly',
                type: ApplicationCommandOptionType.String,
                required: false
            }
        ]
    },
    options: {
        cooldown: 5000
    },
    /**
     * 
     * @param {DiscordBot} client 
     * @param {ChatInputCommandInteraction} interaction 
     */
    run: async (client, interaction) => {
        try {
            const vcId = interaction.member.voice.channelId;
            if (!vcId) {
                return interaction.reply({ ephemeral: true, content: `Join a voice Channel` });
            }

            const searchTerm = interaction.options.getString('search');
            const playlistLink = interaction.options.getString('playlist');

            if (!searchTerm && !playlistLink) {
                return interaction.reply({ content: `Please provide a valid search term or URL.`, ephemeral: true });
            }

            await interaction.deferReply();

            const query = searchTerm ? searchTerm.trim() : playlistLink.trim();
            const isValidUrl = /^https?:\/\/[^\s]+$/.test(query);
            let source;
            
            if (isValidUrl) {
                if (query.includes("youtube.com") || query.includes("youtu.be")) {
                    source = "ytsearch";
                } else if (query.includes("music.youtube.com")) {
                    source = "ytmsearch";
                } else if (query.includes("spotify.com")) {
                    source = "spsearch";
                } else if (query.includes("soundcloud.com")) {
                    source = "scsearch";
                } else {
                    return interaction.editReply({ content: `Unsupported URL source.`, ephemeral: true });
                }
            } else {
                source = "ytsearch";
            }

            const player = client.lavalink.getPlayer(interaction.guildId) || await client.lavalink.createPlayer({
                guildId: interaction.guildId,
                voiceChannelId: vcId,
                textChannelId: interaction.channelId,
                selfDeaf: true,
                selfMute: false,
                volume: client.defaultVolume,
            });

            if (playlistLink) {
                const response = await player.search({ query: playlistLink, source: source }, interaction.user);
                console.log(playlistLink);
                console.log(response);

                if (!response || response.loadType === 'empty' || !response.tracks.length) {
                    return interaction.editReply({ content: `No Tracks found in the playlist.`, ephemeral: true });
                }

                if (response.loadType === 'playlist') {
                    await player.queue.add(response.tracks);
                    const reply = await interaction.editReply({
                        content: `✅ Added [\`${response.tracks.length}\`](<${playlistLink}>) Tracks from the playlist: \`${response.playlist?.name || "Unknown Playlist"}\`.`,
                    });
                    setTimeout(() => reply.delete(), 5000);
                } else {
                    return interaction.editReply({ content: `The provided link is not a playlist.`, ephemeral: true });
                }

                if (!player.playing) {
                    await player.connect();
                    await player.play();
                }
                return;
            } else if (searchTerm) {
                const response = await player.search({ query: searchTerm.trim(), source: source }, interaction.user);

                if (!response || !response.tracks.length) {
                    return interaction.editReply({ content: `No Tracks found`, ephemeral: true });
                } else {
                    await player.queue.add(response.tracks[0]);
                    const reply = await interaction.editReply({
                        content: `✅ Added [\`${response.tracks[0].info.title}\`](<${response.tracks[0].info.uri}>) by \`${response.tracks[0].info.author}\``,
                    });
                    setTimeout(() => reply.delete(), 5000);
                }

                if (!player.playing) {
                    await player.connect();
                    await player.play();
                }
            }
        } catch (error) {
            console.error('Error handling interaction:', error);
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: 'An error occurred while processing your request.', ephemeral: true });
            } else {
                await interaction.reply({ content: 'An error occurred while processing your request.', ephemeral: true });
            }
        }
    }
}).toJSON(); 