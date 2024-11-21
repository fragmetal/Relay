const { Client, Collection, Partials, EmbedBuilder } = require("discord.js");
const CommandsHandler = require("./handler/CommandsHandler");
const { warn, error, info, success } = require("../utils/Console");
const config = require("../config");
const CommandsListener = require("./handler/CommandsListener");
const ComponentsHandler = require("./handler/ComponentsHandler");
const ComponentsListener = require("./handler/ComponentsListener");
const EventsHandler = require("./handler/EventsHandler");
const { QuickYAML } = require('quick-yaml.db');
const { LavalinkManager } = require('lavalink-client');
const {insertDocument, updateDocument, checkDocument, setDocument, deleteDocument } = require('../utils/mongodb');

require('dotenv').config();

class DiscordBot extends Client {
    collection = {
        application_commands: new Collection(),
        message_commands: new Collection(),
        message_commands_aliases: new Collection(),
        components: {
            buttons: new Collection(),
            selects: new Collection(),
            modals: new Collection(),
            autocomplete: new Collection()
        }
    }
    rest_application_commands_array = [];
    login_attempts = 0;
    login_timestamp = 0;
    
    commands_handler = new CommandsHandler(this);
    components_handler = new ComponentsHandler(this);
    events_handler = new EventsHandler(this);
    database = new QuickYAML(config.database.path);

    constructor() {
        super({
            intents: [
                "Guilds",
                "GuildMessages",
                "GuildVoiceStates",
                "GuildMessageReactions",
                "GuildMembers",
                "GuildPresences",
                "MessageContent",
                "GuildMessageTyping",
                "DirectMessages",
                "DirectMessageReactions",
                "DirectMessageTyping"
            ],
            partials: [
                Partials.Channel,
                Partials.GuildMember,
                Partials.Message,
                Partials.Reaction,
                Partials.User
            ],
            presence: {
                activities: [{
                    name: 'keep this empty',
                    type: 4,
                    state: 'Loading...'
                }]
            }
        });

        // Parse the LAVALINK_NODES environment variable
        const nodes = process.env.LAVALINK_NODES.split(';').map(node => {
            const [host, port, authorization] = node.split(':');
            return {
                id: host,
                host: host,
                port: parseInt(port),
                authorization: authorization
            };
        });

        const previouslyUsedSessions = new Map();

        this.lavalink = new LavalinkManager({
            nodes: nodes,
            sessionId: previouslyUsedSessions.get("node"),
            requestSignalTimeoutMS: 3000,
            closeOnError: true,
            heartBeatInterval: 30_000,
            enablePingOnStatsCheck: true,
            retryDelay: 10e3,
            secure: false,
            retryAmount: 5,
            sendToShard: (id, payload) => {
                const guild = this.guilds.cache.get(id);
                if (guild) {
                    guild.shard.send(payload);
                }
            },
            playerOptions: {
                // These are the default prevention methods
                maxErrorsPerTime: {
                    threshold: 10_000,
                    maxAmount: 3,
                },
                // only allow an autoplay function to execute, if the previous function was longer ago than this number.
                minAutoPlayMs: 10_000,
        
                applyVolumeAsFilter: false,
                clientBasedPositionUpdateInterval: 50, // in ms to up-calc player.position
                defaultSearchPlatform: "ytmsearch",
                volumeDecrementer: 0.75, // on client 100% == on lavalink 75%
                onDisconnect: {
                    autoReconnect: true, // automatically attempts a reconnect, if the bot disconnects from the voice channel, if it fails, it get's destroyed
                    destroyPlayer: false // overrides autoReconnect and directly destroys the player if the bot disconnects from the vc
                },
                onEmptyQueue: {
                    // will auto destroy the player after 30s if the queue got empty and autoplay function does not add smt to the queue
                    destroyAfterMs: 30_000, // 1 === instantly destroy | don't provide the option, to don't destroy the player
                    //autoPlayFunction: autoPlayFunction,
                },
                useUnresolvedData: true,
            },
            queueOptions: {
                maxPreviousTracks: 10,
                // only needed if you want and need external storage, don't provide if you don't need to
               // queueStore: new myCustomStore(client.redis), // client.redis = new redis()
                // only needed, if you want to watch changes in the queue via a custom class,
                //queueChangesWatcher: new myCustomWatcher(client)
            },
            linksAllowed: true,
            // example: don't allow p*rn / youtube links., you can also use a regex pattern if you want.
            // linksBlacklist: ["porn", "youtube.com", "youtu.be"],
            linksBlacklist: [],
            linksWhitelist: [],
            advancedOptions: {
                enableDebugEvents: true,
                maxFilterFixDuration: 600_000, // only allow instafixfilterupdate for tracks sub 10mins
                debugOptions: {
                    noAudio: false,
                    playerDestroy: {
                        dontThrowError: false,
                        debugLog: false,
                    },
                    logCustomSearches: false,
                }
            }
        });

        new CommandsListener(this);
        new ComponentsListener(this);

        // Initialize Lavalink when the bot is ready
        this.on("ready", async () => {
            await this.lavalink.init({ ...this.user, shards: "auto" });
        });

        // Handle raw events from Discord
        this.on("raw", async (payload) => {
            await this.lavalink.sendRawData(payload);
        });

        // Lavalink node event listeners
        this.lavalink.nodeManager.on("connect", async (node) => {
            node.updateSession(true, 360e3);
            previouslyUsedSessions.set(node.id, node.sessionId)
            success(`The Lavalink Node #${node.id} connected`);
        })
        .on("disconnect", async (node, _reason) => {
            error(`The Lavalink Node #${node.id} disconnected. reconnecting...`);
        })
        .on("reconnect", async (node) => {
            info(`The Lavalink Node #${node.id} is attempting to reconnect`);
        })
        .on("reconnectInProgress", async (node) => {
            info(`The Lavalink Node #${node.id} reconnection process started`);
        })
        .on("create", async (node) => {
            success(`A new Lavalink Node #${node.id} was created`);
        })
        .on("destroy", async (node) => {
            error(`The Lavalink Node #${node.id} was destroyed`);
        })
        .on("error", async (node, _err, _payload) => {
            error(`The Lavalink Node #${node.id} offline`);
        })
        .on("resumed", async (node, payload, players) => {
            // create players:
            for (const fetchedPlayer of players) {
                // fetchedPlayer is the live data from lavalink
                // saved Player data is the config you should save in a database / file or smt
                const savedPlayerData = await this.getSavedPlayerData(fetchedPlayer.guildId);
                if (!savedPlayerData) {
                    await insertDocument('playerData', { guildId: fetchedPlayer.guildId }, fetchedPlayer);
                }
                // if lavalink says the bot got disconnected, we can skip the resuming, or force reconnect whatever you want!, here we choose to not do anything and thus delete the saved player data
                if (!fetchedPlayer.state.connected) {
                    console.log("skipping resuming player, because it already disconnected");
                    await this.deletedSavedPlayerData(fetchedPlayer.guildId);
                    continue;
                }
                // now you can create the player based on the live and saved data
                const player = this.lavalink.createPlayer({
                    guildId: fetchedPlayer.guildId,
                    node: node.id,
                    // you need to update the volume of the player by the volume of lavalink which might got decremented by the volume decrementer
                    volume: this.lavalink.options.playerOptions?.volumeDecrementer
                        ? Math.round(fetchedPlayer.volume / this.lavalink.options.playerOptions.volumeDecrementer)
                        : fetchedPlayer.volume,
                    // all of the following options are needed to be provided by some sort of player saving
                    voiceChannelId: savedPlayerData.voiceChannelId,
                    textChannelId: savedPlayerData.textChannelId,
                    // all of the following options can either be saved too, or you can use pre-defined defaults
                    selfDeaf: savedPlayerData.options?.selfDeaf || true,
                    selfMute: savedPlayerData.options?.selfMute || false,

                    applyVolumeAsFilter: savedPlayerData.options.applyVolumeAsFilter,
                    instaUpdateFiltersFix: savedPlayerData.options.instaUpdateFiltersFix,
                    vcRegion: savedPlayerData.options.vcRegion,
                });

                // player.voice = fetchedPlayer.voice;
                // normally just player.voice is enough, but if you restart the entire bot, you need to create a new connection, thus call player.connect();
                await player.connect();

                player.filterManager.data = fetchedPlayer.filters; // override the filters data
                await player.queue.utils.sync(true, false); // get the queue data including the current track (for the requester)
                // override the current track with the data from lavalink
                if (fetchedPlayer.track) player.queue.current = this.lavalink.utils.buildTrack(fetchedPlayer.track, player.queue.current?.requester || this.user);
                // override the position of the player
                player.lastPosition = fetchedPlayer.state.position;
                player.lastPositionChange = Date.now();
                // you can also override the ping of the player, or wait about 30s till it's done automatically
                player.ping.lavalink = fetchedPlayer.state.ping;
                // important to have skipping work correctly later
                player.paused = fetchedPlayer.paused;
                player.playing = !fetchedPlayer.paused && !!fetchedPlayer.track;
                // That's about it
            }
        });
        
        // Example of handling player events
        this.lavalink.on("trackStart", async (player, track, payload) => {
            const avatarURL = track?.requester?.avatar || undefined;

            const formatDuration = (duration) => {
                if (!duration || duration <= 0) return "Unknown Duration";

                const totalSeconds = Math.floor(duration / 1000);
                const hours = Math.floor(totalSeconds / 3600);
                const minutes = Math.floor((totalSeconds % 3600) / 60);
                const seconds = totalSeconds % 60;

                return `${hours > 0 ? `${hours}:` : ''}${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            };

            const channel = this.channels.cache.get(player.textChannelId);

            if (channel?.isTextBased()) {
                const messages = await channel.messages.fetch({ limit: 10 });
                const lastMessage = messages.find(msg => msg.embeds.length > 0 && msg.author.id === this.user.id);

                if (lastMessage) {
                    const embed = EmbedBuilder.from(lastMessage.embeds[0]);
                    embed.setTitle(`🎶 ${track?.info?.title}`.substring(0, 256))
                        .setThumbnail(track?.info?.artworkUrl || track?.pluginInfo?.artworkUrl || null)
                        .setDescription(
                            [
                                `> - **Author:** ${track?.info?.author}`,
                                `> - **Duration:** ${formatDuration(track?.info?.duration || 0)} | Ends <t:${Math.floor((Date.now() + (track?.info?.duration || 0)) / 1000)}:R>`,
                                `> - **Source:** ${track?.info?.sourceName}`,
                                `> - **Requester:** <@${track?.requester?.id}>`,
                                track?.pluginInfo?.clientData?.fromAutoplay ? `> *From Autoplay* ✅` : undefined
                            ].filter(Boolean).join("\n").substring(0, 4096)
                        )
                        .setFooter({
                            text: `Requested by ${track?.requester?.username}`,
                            iconURL: /^https?:\/\//.test(avatarURL || "") ? avatarURL : undefined,
                        })
                        .setTimestamp();

                    if (track?.info?.uri && /^https?:\/\//.test(track?.info?.uri)) {
                        embed.setURL(track.info.uri);
                    }

                    await lastMessage.edit({ embeds: [embed] });
                } else {
                    const embeds = [
                        new EmbedBuilder()
                            .setColor("Blurple")
                            .setTitle(`🎶 ${track?.info?.title}`.substring(0, 256))
                            .setThumbnail(track?.info?.artworkUrl || track?.pluginInfo?.artworkUrl || null)
                            .setDescription(
                                [
                                    `> - **Author:** ${track?.info?.author}`,
                                    `> - **Duration:** ${formatDuration(track?.info?.duration || 0)} | Ends <t:${Math.floor((Date.now() + (track?.info?.duration || 0)) / 1000)}:R>`,
                                    `> - **Source:** ${track?.info?.sourceName}`,
                                    `> - **Requester:** <@${track?.requester?.id}>`,
                                    track?.pluginInfo?.clientData?.fromAutoplay ? `> *From Autoplay* ✅` : undefined
                                ].filter(Boolean).join("\n").substring(0, 4096)
                            )
                            .setFooter({
                                text: `Requested by ${track?.requester?.username}`,
                                iconURL: /^https?:\/\//.test(avatarURL || "") ? avatarURL : undefined,
                            })
                            .setTimestamp()
                    ];

                    if (track?.info?.uri && /^https?:\/\//.test(track?.info?.uri)) {
                        embeds[0].setURL(track.info.uri);
                    }

                    await channel.send({
                        content: '',
                        embeds
                    });
                }
            }
        })
        .on("trackStuck", async (player, track, payload) => {
            error(`Track stuck: ${track ? track.title : 'unknown'}`);
        })
        .on("trackError", async (player, track, payload) => {
            error(`Error with track: ${track ? track.title : 'unknown'}`);
        })
        .on("trackEnd", async (player, track, payload) => {
            //info(`Finished playing: ${track ? track.title : 'unknown'}`);
        })
        .on("queueEnd", async (player, track, payload) => {
            const channel = this.channels.cache.get(player.textChannelId);

            if (channel?.isTextBased()) {
                const lastMessage = await channel.messages.fetch({ limit: 1 }).then(messages => messages.first());
                if (lastMessage) {
                    const embed = new EmbedBuilder()
                        .setColor("Red")
                        .setTitle("Queue Ended")
                        .setDescription("The music queue has ended.")
                        .setTimestamp();

                    await lastMessage.edit({ embeds: [embed] });
                    setTimeout(() => lastMessage.delete(), 3000);
                }
            }
        })
        .on("playerCreate", async (player) => {
            //info(`Player created`);
        })
        .on("playerDestroy", async (player, reason) => {
            await this.deletedSavedPlayerData(player.guildId);
        })
        .on("playerDisconnect", async (player, voiceChannelId) => {
            //info(`Player disconnected from voice channel: ${voiceChannelId}`);
        })
        .on("playerMove", async (player, oldChannelId, newChannelId) => {
            //info(`Player moved from channel ${oldChannelId} to ${newChannelId}`);
        })
        .on("playerSocketClosed", async (player, payload) => {
            //error(`Player socket closed: `, payload);
        })
        .on("playerUpdate", async (oldPlayer, newPlayer) => {
            await this.setSavedPlayerData(newPlayer.toJSON());
        })
        .on("playerMuteChange", async (player, muted, serverMuted) => {
            //info(`Player mute state changed. Muted: ${muted}, Server Muted: ${serverMuted}`);
        })
        .on("playerDeafChange", async (player, deaf, serverDeaf) => {
            //info(`Player deaf state changed. Deaf: ${deaf}, Server Deaf: ${serverDeaf}`);
        })
        .on("playerSupressChange", async (player, supress) => {
            //info(`Player suppress state changed: ${supress}`);
        })
        .on("playerQueueEntryStart", async (player, track) => {
            //info(`Queue entry started for track: ${track ? track.title : 'unknown'}`);
        })
        .on("playerQueueEntryEnd", async (player, track) => {
            //info(`Queue entry ended for track: ${track ? track.title : 'unknown'}`);
        })
        .on("playerQueueEntryCancel", async (player, track) => {
            //info(`Queue entry cancelled for track: ${track ? track.title : 'unknown'}`);
        })
        .on("playerEmpty", async (player, track, send) => {
            //info(`Player empty event triggered for track: ${track ? track.title : 'unknown'}`);
        })
        .on("playerEmptyWithQueue", async (player, send) => {
            //info(`Player empty with queue event triggered`);
        });
    }

    startStatusRotation = () => {
        let index = 0;
        
        setInterval(() => {
            const uptime = process.uptime();
            const hours = Math.floor(uptime / 3600);
            const minutes = Math.floor((uptime % 3600) / 60);
            const seconds = Math.floor(uptime % 60);
            const formattedUptime = `${hours}h ${minutes}m ${seconds}s`;

            const statusMessages = [
                { name: `Use /help to see all commands`, type: 4 },
                { name: `Uptime | ${formattedUptime}`, type: 4 },
                { name: `Serving Guilds | ${this.guilds.cache.size}`, type: 4 }
            ];
            this.user.setPresence({ activities: [statusMessages[index]] });
            index = (index + 1) % statusMessages.length;
        }, 5000);
    }

    connect = async () => {
        warn(`Attempting to connect to the Discord bot... (${this.login_attempts + 1})`);

        this.login_timestamp = Date.now();

        try {
            await this.login(process.env.CLIENT_TOKEN);
            this.commands_handler.load();
            this.components_handler.load();
            this.events_handler.load();
            this.startStatusRotation();

            warn('Attempting to register application commands... (this might take a while!)');
            await this.commands_handler.registerApplicationCommands(config.development);
            success('Successfully registered application commands. For specific guild? ' + (config.development.enabled ? 'Yes' : 'No'));
        } catch (err) {
            error('Failed to connect to the Discord bot, retrying...');
            error(err);
            this.login_attempts++;
            setTimeout(this.connect, 5000);
        }
    }

    // Function to get saved player data
    getSavedPlayerData = async (guildId) => {
        try {
            const data = await checkDocument('playerData', { guildId });
            return data || []; // Return an empty array if no data found
        } catch (err) {
            error(`Failed to get saved player data for guild ${guildId}: ${err.message}`);
            return null; // Return null in case of error
        }
    }

    // Function to delete saved player data
    deletedSavedPlayerData = async (guildId) => {
        try {
            await deleteDocument('playerData', { guildId });
            // success(`Deleted saved player data for guild ${guildId}`);
        } catch (err) {
            error(`Failed to delete saved player data for guild ${guildId}: ${err.message}`);
        }
    }

    // Function to set saved player data
    setSavedPlayerData = async (playerData) => {
        try {
            await setDocument('playerData', { guildId: playerData.guildId }, playerData);
            // success(`Saved player data for guild ${playerData.guildId}`);
        } catch (err) {
            error(`Failed to save player data for guild ${playerData.guildId}: ${err.message}`);
        }
    }
}

module.exports = DiscordBot;
