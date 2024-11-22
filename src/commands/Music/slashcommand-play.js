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
            if (!vcId) return interaction.reply({ ephemeral: true, content: `Join a voice Channel` });

            const song = interaction.options.getString('search');
            const playlistUrl = interaction.options.getString('playlist');

            // Check if the searching input is valid
            if (!song && !playlistUrl) {
                return interaction.reply({ content: `Please provide a valid search term or URL.`, ephemeral: true });
            }

            // Acknowledge the interaction immediately
            await interaction.deferReply();

            // Automatically determine the source based on the searching input
            const cleanedQuery = song ? song.replace(/\s+/g, '') : playlistUrl;
            const isUrl = /^https?:\/\/[^\s]+$/.test(cleanedQuery);
            let src;

            // Automatically detect the source based on the URL
            if (isUrl) {
                if (cleanedQuery.includes("youtube.com") || cleanedQuery.includes("youtu.be")) {
                    src = "ytsearch";
                } else if (cleanedQuery.includes("music.youtube.com")) {
                    src = "ytmsearch";
                } else if (cleanedQuery.includes("spotify.com")) {
                    src = "spsearch";
                } else if (cleanedQuery.includes("soundcloud.com")) {
                    src = "scsearch";
                }
            } else {
                src = "ytmsearch";
            }

            // Logic to play the song using Lavalink
            const player = client.lavalink.getPlayer(interaction.guildId) || await client.lavalink.createPlayer({
                guildId: interaction.guildId,
                voiceChannelId: vcId,
                textChannelId: interaction.channelId,
                selfDeaf: true,
                selfMute: false,
                volume: client.defaultVolume,
            });

            // If a playlist URL is provided, handle it directly
            if (playlistUrl) {
                const response = await player.search({ query: playlistUrl, source: src }, interaction.user);
                if (response.loadType === "playlist") {
                    await player.queue.add(response.tracks);
                    await interaction.editReply({
                        content: `✅ Added [\`${response.tracks.length}\`](<${playlistUrl}>) Tracks from the playlist: \`${response.playlist.name || "Unknown Playlist"}\`.`,
                    });
                    if (!player.playing) {
                        await player.connect();
                        await player.play();
                    }
                    return;
                }
            }

            // Search for tracks based on the user's input if no playlist URL is provided
            const response = await player.search({ query: song, source: src }, interaction.user);
            
            // Check if the response is a playlist
            if (!response || !response.tracks.length) {
                return interaction.editReply({ content: `No Tracks found`, ephemeral: true });
            } else {
                // If it's not a playlist, handle it as a single track
                await player.queue.add(response.tracks[0]);

                // Reply with the confirmation message for a single track
                await interaction.editReply({
                    content: `✅ Added [\`${response.tracks[0].info.title}\`](<${response.tracks[0].info.uri}>) by \`${response.tracks[0].info.author}\``,
                });
            }

            // Play the track only if the player is not already playing
            if (!player.playing) {
                await player.connect();
                await player.play();
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