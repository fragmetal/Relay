const { ChatInputCommandInteraction, ButtonStyle } = require("discord.js");
const DiscordBot = require("../../client/DiscordBot");
const ApplicationCommand = require("../../structure/ApplicationCommand");

module.exports = new ApplicationCommand({
    command: {
        name: 'setup',
        description: 'Setup command for initial configuration using components.',
        type: 1,
        options: []
    },
    options: {
        botDevelopers: true
    },
    /**
     * 
     * @param {DiscordBot} client 
     * @param {ChatInputCommandInteraction} interaction 
     */
    run: async (client, interaction) => {
        await interaction.reply({
            content: `Please choose an action:`,
            components: [
                {
                    type: 1,
                    components: [
                        {
                            type: 2, // Button for creating channels
                            custom_id: 'create-channels',
                            label: 'Create Channels',
                            style: ButtonStyle.Primary
                        },
                        {
                            type: 2, // Button for deleting channels
                            custom_id: 'delete-channels',
                            label: 'Delete Channels',
                            style: ButtonStyle.Danger
                        }
                    ]
                }
            ]
        });
    }
}).toJSON(); 