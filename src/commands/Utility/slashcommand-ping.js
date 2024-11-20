const { ChatInputCommandInteraction, EmbedBuilder } = require("discord.js");
const DiscordBot = require("../../client/DiscordBot");
const ApplicationCommand = require("../../structure/ApplicationCommand");
const os = require('os');

module.exports = new ApplicationCommand({
    command: {
        name: 'ping',
        description: 'Replies with Pong!',
        type: 1,
        options: []
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
        const ping = client.ws.ping;
        const ramUsage = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
        const cpuUsage = os.loadavg()[0].toFixed(2);

        const embed = new EmbedBuilder()
            .setColor("Blurple")
            .setTitle("Pong!")
            .addFields(
                { name: 'Ping', value: `${ping}ms`, inline: true },
                { name: 'RAM Usage', value: `${ramUsage} MB`, inline: true },
                { name: 'CPU Usage', value: `${cpuUsage}%`, inline: true }
            )
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
}).toJSON();