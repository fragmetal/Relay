const AutocompleteComponent = require("../../structure/AutocompleteComponent");

module.exports = new AutocompleteComponent({
    commandName: 'play',
    run: async (client, interaction) => {
        const focusedQuery = interaction.options.getFocused();
        const src = interaction.options.getString('source');

        // Ensure the user is in a voice channel
        const vcId = interaction.member.voice.channelId;
        // Convert duration to hh:mm:ss format
        function formatDuration(duration) {
            if (!duration || duration <= 0) return "Unknown Duration"; // Handle invalid duration

            const totalSeconds = Math.floor(duration / 1000);
            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const seconds = totalSeconds % 60;

            return `${hours > 0 ? `${hours}:` : ''}${minutes < 10 ? '0' : ''}${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
        }

        if (!vcId) {
            return await interaction.respond([{ name: `Join a voice Channel`, value: "join_vc" }]);
        }

        const player = client.lavalink.getPlayer(interaction.guildId) || await client.lavalink.createPlayer({
            guildId: interaction.guildId,
            voiceChannelId: vcId,
            textChannelId: interaction.channelId,
            selfDeaf: true,
            selfMute: false,
            volume: client.defaultVolume,
        });

        if (!focusedQuery.trim()) {
            return await interaction.respond([{ name: `Please enter a search keyword`, value: "no_query" }]);
        }
        const cleanedQuery = focusedQuery.replace(/\s+/g, '');
        // Check if the cleaned query is a URL
        const isUrl = /^https?:\/\//.test(cleanedQuery);
        // Search for tracks based on the user's input if it's a URL, else use the original query
        const response = await player.search({ query: isUrl ? cleanedQuery : focusedQuery, source: src }, interaction.user);

        if (!response || !response.tracks.length) {
            return await interaction.respond([{ name: `No Tracks found`, value: "nothing_found" }]);
        }

        if (focusedQuery.includes("playlist")) {

            if (!response.tracks || !response.tracks.length) {
                return await interaction.respond([{ name: `No Tracks found in playlist`, value: "nothing_found" }]);
            }
            
            const totalDuration = response.tracks.reduce((acc, track) => acc + track.info.duration, 0);
            const playlistName = response.playlist?.name || "Unknown Playlist";
            const playlistUrl = response.playlist?.uri || "unknown_url";

            const playlistInfo = `Name: ${playlistName} | ${response.tracks.length} Songs | ${formatDuration(totalDuration)}`;
            const choices = [{ name: playlistInfo, value: playlistUrl }];
            
            await interaction.respond(choices);
            return;
        }

        // if (focusedQuery.includes("playlist")) {
        //     const playlistName = response.playlist?.name || "Unknown Playlist";
        //     const cleanedQuery = focusedQuery.replace(/\s+/g, '');
        //     return await interaction.respond([{ name: `Playlist: ${playlistName} - ${response.tracks.length} tracks`, value: `${cleanedQuery}` }]);
        // }

        const choices = response.tracks.map(track => {
            let title = track.info.title;
            const artist = track.info.author;
            const duration = formatDuration(track.info.duration);

            // If the title is over 80 characters, cut it and add artist and duration
            if (title.length > 80) {
                title = title.substring(0, 80) + '...';
            }

            const finalName = `${title} by ${artist} (${duration})`;

            return {
                name: finalName,
                value: track.info.uri.length > 100 ? track.info.uri.substring(0, 90) + '...' : track.info.uri
            };
        }).filter(choice => choice.name.length > 0 && choice.name.length <= 90);

        // Respond with the choices
        await interaction.respond(choices);
    }
}).toJSON();