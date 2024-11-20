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
                name: 'source',
                description: 'From which Source you want to play?',
                type: ApplicationCommandOptionType.String,
                required: true,
                choices: [
                    { name: "Youtube", value: "ytsearch" },
                    { name: "Youtube Music", value: "ytmsearch" },
                    { name: "Soundcloud", value: "scsearch" },
                    // { name: "Deezer", value: "dzsearch" },
                    { name: "Spotify", value: "spsearch" },
                    // { name: "Apple Music", value: "amsearch" },
                    // { name: "Bandcamp", value: "bcsearch" },
                    // { name: "Cornhub", value: "phsearch" },
                ]
            },
            {
                name: 'query',
                description: 'What to play?',
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
        const vcId = interaction.member.voice.channelId;
        if (!vcId) return interaction.reply({ ephemeral: true, content: `Join a voice Channel` });

        const src = interaction.options.getString('source');
        const query = interaction.options.getString('query');
        
        // Logic to play the song using Lavalink
        const player = client.lavalink.getPlayer(interaction.guildId) || await client.lavalink.createPlayer({
            guildId: interaction.guildId,
            voiceChannelId: vcId,
            textChannelId: interaction.channelId,
            selfDeaf: true,
            selfMute: false,
            volume: client.defaultVolume,
        });

        // Search for tracks based on the user's input
        const response = await player.search({ query, source: src }, interaction.user);
        if (!response || !response.tracks.length) return interaction.reply({ content: `No Tracks found`, ephemeral: true });

        // Add the track to the queue
        await player.queue.add(response.loadType === "playlist" ? response.tracks : response.tracks[0]);

        // Reply with the confirmation message
        await interaction.reply({
            content: response.loadType === "playlist"
                ? `✅ Added [${response.tracks.length}] Tracks`
                : `✅ Added [\`${response.tracks[0].info.title}\`](<${response.tracks[0].info.uri}>) by \`${response.tracks[0].info.author}\``,
            ephemeral: true
        }).then(msg => {
            setTimeout(() => msg.delete(), 3000);
        });
        // Play the track only if the player is not already playing
        if (!player.playing) {
            await player.connect();
            await player.play();
        }
    }
}).toJSON(); 