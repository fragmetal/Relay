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

        this.lavalink = new LavalinkManager({
            nodes: nodes,
            sendToShard: (id, payload) => {
                const guild = this.guilds.cache.get(id);
                if (guild) {
                    guild.shard.send(payload);
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
            info(`The Lavalink Node #${node.id} resumed. Ensure to add players to the manager.`);
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

        })
        .on("playerCreate", async (player) => {
            //info(`Player created`);
        })
        .on("playerDestroy", async (player, reason) => {
            //error(`Player destroyed. Reason: ${reason}`);
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
        .on("playerUpdate", async (player) => {
            //info(`Player updated: ${player.id}`);
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
}

module.exports = DiscordBot;
