// const { ChannelType } = require('discord.js');
const { success } = require("../../utils/Console");
const Event = require("../../structure/Event");
const createInterface = require("../../utils/createInterface");
const { checkDocument } = require('../../utils/mongodb');

module.exports = new Event({
    event: 'ready',
    once: true,
    run: async (__client__, client) => {
        try {
            success('Logged in as ' + client.user.displayName + ', took ' + ((Date.now() - __client__.login_timestamp) / 1000) + "s.");
            
            const guildId = client.guilds.cache.first().id;
            const settings = await checkDocument('voice_channels', { _id: guildId });

            if (!settings || !settings.vc_dashboard) {
                console.log(`No vc_dashboard found for guild: ${guildId}`);
                return;
            }

            const channel = await client.channels.fetch(settings.vc_dashboard);

            if (channel && channel.isTextBased()) {
                await createInterface(channel);
            } else {
                console.error(`Channel with ID "${settings.vc_dashboard}" not found or is not a text channel.`);
            }

        } catch (err) {
            console.error('Error during the ready event:', err);
        }
    }
}).toJSON();