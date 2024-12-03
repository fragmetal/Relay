const AutocompleteComponent = require("../../structure/AutocompleteComponent");

module.exports = new AutocompleteComponent({
    commandName: 'play',
    run: async (client, interaction) => {
        const currentInput = interaction.options.getFocused();

        if (!currentInput) {
            return interaction.respond([]);
        } else {
            try {
                const player = client.lavalink.getPlayer(interaction.guildId) || client.lavalink.createPlayer({
                    guildId: interaction.guildId,
                    voiceChannelId: interaction.member.voice.channelId,
                    textChannelId: interaction.channelId,
                    selfDeaf: true,
                    selfMute: false,
                    volume: client.defaultVolume,
                });

                const response = await player.search({ query: currentInput, source: 'ytsearch' }, interaction.user);

                if (!response || response.loadType === 'empty' || !response.tracks.length) {
                    return interaction.respond([]);
                }
                
                if (response.loadType === 'playlist') {
                    const playlistName = response.playlist?.name || "Unknown Playlist";
                    await interaction.respond([{ name: `Playlist: ${playlistName}`, value: currentInput }]);
                    return;
                }else {
                    const tracks = response.tracks.slice(0, 25); // Limit to 25 results
                    const choices = tracks.map(track => {
                        const duration = new Date(track.info.duration).toISOString().substring(11, 19);
                        let name = `${track.info.title} - By ${track.info.author}`;

                        if (name.length + duration.length + 12 > 90) {
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
            } catch (error) {
                console.error('Error during autocomplete search:', error);
                await interaction.respond([]);
            }
        }
    }
}).toJSON();