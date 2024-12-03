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
                name: 'input',
                description: 'What to play? Paste the link or search',
                type: ApplicationCommandOptionType.String,
                required: true,
                autocomplete: true
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
            await interaction.deferReply();
            if (!vcId) {
                return interaction.followUp({ ephemeral: true, content: `Join a voice Channel` });
            }

            const input = interaction.options.getString('input');
            const isValidUrl = /^https?:\/\/[^\s]+$/.test(input);
            let source;
            
            if (!input) {
                return interaction.followUp({ content: `Please provide a valid search term or URL.`, ephemeral: true });
            }

            if (isValidUrl) {
                if (input.includes("youtube.com") || input.includes("youtu.be")) {
                    source = "ytsearch";
                } else if (input.includes("music.youtube.com")) {
                    source = "ytmsearch";
                } else if (input.includes("spotify.com")) {
                    source = "spsearch";
                } else if (input.includes("soundcloud.com")) {
                    source = "scsearch";
                } else {
                    return interaction.followUp({ content: `Unsupported URL source.`, ephemeral: true });
                }
            }

            const player = client.lavalink.getPlayer(interaction.guildId) || client.lavalink.createPlayer({
                guildId: interaction.guildId,
                voiceChannelId: vcId,
                textChannelId: interaction.channelId,
                selfDeaf: true,
                selfMute: false,
                volume: client.defaultVolume,
            });
            
            const response = await player.search({ query: input, source: source }, interaction.user);

            if (!response || response.loadType === 'empty' || !response.tracks.length) {
                return interaction.followUp({ content: `No Tracks found.`, ephemeral: true });
            }

            if (response.loadType === 'playlist' && response.tracks.length > 0) {
                await player.queue.add(response.tracks);
                const reply = await interaction.followUp({
                    content: `✅ Added [\`${response.tracks.length}\`](<${input}>) Tracks from the playlist: \`${response.playlist?.name || "Unknown Playlist"}\`.`,
                });
                setTimeout(() => reply.delete(), 5000);
            } else if (response.loadType === 'track' || response.tracks.length === 1) {
                await player.queue.add(response.tracks[0]);
                const reply = await interaction.followUp({
                    content: `✅ Added [\`${response.tracks[0].info.title}\`](<${response.tracks[0].info.uri}>) by \`${response.tracks[0].info.author}\`.`,
                });
                setTimeout(() => reply.delete(), 5000);
            } else {
                return interaction.followUp({ content: `The provided input is not a valid track or contains no tracks.`, ephemeral: true });
            }

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