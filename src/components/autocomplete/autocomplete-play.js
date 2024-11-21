const AutocompleteComponent = require("../../structure/AutocompleteComponent");

module.exports = new AutocompleteComponent({
    commandName: 'play',
    run: async (client, interaction) => {
        // Check if the interaction is still valid before responding
        if (!interaction.isCommand()) return; // Ensure it's a command interaction

        const focussedQuery = interaction.options.getFocused();
        const src = interaction.options.getString('source');

        // Ensure the user is in a voice channel
        const vcId = interaction.member.voice.channelId;
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

        if (!focussedQuery.trim()) {
            return await interaction.respond([{ name: `Please enter a search keyword`, value: "no_query" }]);
        }

        // Search for tracks based on the user's input
        const response = await player.search({ query: focussedQuery, source: src }, interaction.user);

        if (!response || !response.tracks.length) {
            return await interaction.respond([{ name: `No Tracks found`, value: "nothing_found" }]);
        }

        if (focussedQuery.includes("playlist")) {
            const playlistName = response.playlist?.name || "Unknown Playlist";
            const cleanedQuery = focussedQuery.replace(/\s+/g, '');
            return await interaction.respond([{ name: `Playlist: ${playlistName} - ${response.tracks.length} tracks`, value: `${cleanedQuery}` }]);
        }

        // Convert duration to hh:mm:ss format
        function formatDuration(duration) {
            if (!duration || duration <= 0) return "Unknown Duration"; // Handle invalid duration

            const totalSeconds = Math.floor(duration / 1000);
            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const seconds = totalSeconds % 60;

            return `${hours > 0 ? `${hours}:` : ''}${minutes < 10 ? '0' : ''}${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
        }

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