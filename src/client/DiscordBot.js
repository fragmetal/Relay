const { Client, Collection, Partials } = require("discord.js");
const CommandsHandler = require("./handler/CommandsHandler");
const { info, warn, error, success } = require("../utils/Console");
const config = require("../config");
const CommandsListener = require("./handler/CommandsListener");
const ComponentsHandler = require("./handler/ComponentsHandler");
const ComponentsListener = require("./handler/ComponentsListener");
const EventsHandler = require("./handler/EventsHandler");
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
                activities: [{ name: 'keep this empty', type: 4, state: 'Loading...' }]
            }
        });

        new CommandsListener(this);
        new ComponentsListener(this);
    }

    startStatusRotation = () => {
        let index = 0;

        setInterval(() => {
            const uptime = process.uptime();
            const days = Math.floor(uptime / 86400);
            const hours = Math.floor((uptime % 86400) / 3600);
            const minutes = Math.floor((uptime % 3600) / 60);
            const seconds = Math.floor(uptime % 60);
            const formattedUptime = `${days}d ${hours}h ${minutes}m ${seconds}s`;

            const statusMessages = [
                { name: `Up | ${formattedUptime}`, type: 4 },
            ];
            this.user.setPresence({ activities: [statusMessages[index]] });
            index = (index + 1) % statusMessages.length;
        }, 5000);
    }

    connect = async () => {
        this.login_timestamp = Date.now();
        this.login_attempts++;

        info(`🔌 [${this.login_attempts}] Connecting Discord bot...`);

        try {
            await this.login(process.env.CLIENT_TOKEN);

            this.commands_handler.load();
            this.components_handler.load();
            this.events_handler.load();
            this.startStatusRotation();

            info('📡 Registering application commands (this might take a while)...');
            await this.commands_handler.registerApplicationCommands(config.development);

            success('✅ Commands registered. Specific guild? ' + (config.development.enabled ? 'Yes' : 'No'));

        } catch (err) {
            error(`❌ Connection failed (attempt ${this.login_attempts}), retrying in 5s...`);
            error(err);

            setTimeout(() => this.connect(), 5000);
        }
    }
}

module.exports = DiscordBot;
