const AutocompleteComponent = require("../../structure/AutocompleteComponent");

module.exports = new AutocompleteComponent({
    commandName: 'play',
    run: async (client, interaction) => {
        const focusedQuery = interaction.options.getFocused();
        const src = interaction.options.getString('source');

        // Ensure the user is in a voice channel
        const vcId = interaction.member.voice.channelId;

        if (!vcId) {
            try {
                await interaction.respond([{ name: `Join a voice Channel`, value: "join_vc" }]);
            } catch (err) {
                console.error('Failed to respond to interaction:', err);
            }
            return;
        }

        const player = client.lavalink.getPlayer(interaction.guildId) || await client.lavalink.createPlayer({
            guildId: interaction.guildId,
            voiceChannelId: vcId,
            textChannelId: interaction.channelId,
            selfDeaf: true,
            selfMute: false,
            volume: client.defaultVolume,
        });

        if (!focusedQuery) {
            try {
                await interaction.respond([{ name: `Please enter a search keyword`, value: "no_query" }]);
            } catch (err) {
                console.error('Failed to respond to interaction:', err);
            }
            return;
        }

        const cleanedQuery = focusedQuery.replace(/\s+/g, '');
        const isUrl = /^https?:\/\/[^\s]+$/.test(cleanedQuery);
        let searchSource = src;

        // Automatically detect the source based on the URL
        if (isUrl) {
            if (cleanedQuery.includes("youtube.com") || cleanedQuery.includes("youtu.be")) {
                searchSource = "ytsearch";
            } else if (cleanedQuery.includes("spotify.com")) {
                searchSource = "spsearch";
            } else if (cleanedQuery.includes("soundcloud.com")) {
                searchSource = "scsearch";
            } else {
                searchSource = "ytmsearch"; // Default for unknown URLs
            }
        } else {
            searchSource = "ytmsearch"; // Default for keyword searches
        }

        const response = await player.search({ query: isUrl ? cleanedQuery : focusedQuery, source: searchSource }, interaction.user);

        // Check if the search is a playlist URL
        if (isUrl && response.loadType === "playlist") {
            await player.queue.add(response.tracks);
            const playlistName = response.playlist.name || "Unknown Playlist";
            const responseMessage = `✅ Added [${response.tracks.length}] Tracks from the playlist: ${playlistName}.`;
            await interaction.respond([{
                name: responseMessage.substring(0, 100),
                value: "playlist_added"
            }]);
            if (!player.playing) {
                await player.connect();
                await player.play();
            }
            return; // Exit early since we handled the playlist
        }

        if (!response || !response.tracks.length) {
            try {
                await interaction.respond([{ name: `No Tracks found`, value: "nothing_found" }]);
            } catch (err) {
                console.error('Failed to respond to interaction:', err);
            }
            return;
        }

        let choices;
        if (!isUrl) {
            choices = response.tracks.slice(0, 30).map(track => {
                const duration = new Date(track.info.duration).toISOString().substring(11, 19);
                let name = `${track.info.title} - By ${track.info.author}`;
                
                if (name.length + duration.length + 12 > 90) { // 12 accounts for " - Duration: "
                    const maxLength = 90 - duration.length - 12;
                    name = name.substring(0, maxLength).trim() + '...';
                }
                
                name += ` - Duration: ${duration}`;
                
                return {
                    name: name,
                    value: track.info.uri
                };
            });
            await interaction.respond(choices);
        }
    }
}).toJSON();