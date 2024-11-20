const { ChatInputCommandInteraction, EmbedBuilder } = require("discord.js");
const DiscordBot = require("../../client/DiscordBot");
const ApplicationCommand = require("../../structure/ApplicationCommand");

module.exports = new ApplicationCommand({
    command: {
        name: 'help',
        description: 'Replies with a list of available application commands.',
        type: 1,
        options: []
    },
    options: {
        cooldown: 10000
    },
    /**
     * 
     * @param {DiscordBot} client 
     * @param {ChatInputCommandInteraction} interaction 
     */
    run: async (client, interaction) => {
        const commands = client.collection.application_commands.map(cmd => ({
            name: `/${cmd.command.name}`,
            description: cmd.command.description || "No description available."
        }));

        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('Available Commands')
            .setDescription('Here are the commands you can use:')
            .addFields(commands.map(cmd => ({
                name: cmd.name,
                value: cmd.description,
                inline: true
            })))
            .setFooter({ text: 'Use the commands wisely!' });

        await interaction.reply({ embeds: [embed] });
    }
}).toJSON();