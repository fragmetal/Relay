const { ButtonInteraction, ActionRowBuilder, StringSelectMenuBuilder } = require("discord.js");
const DiscordBot = require("../../client/DiscordBot");
const Component = require("../../structure/Component");

module.exports = new Component({
    customId: 'song_loop',
    type: 'button',
    /**
     * 
     * @param {DiscordBot} client 
     * @param {ButtonInteraction} interaction 
     */
    run: async (client, interaction) => {
        const row = new ActionRowBuilder()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('loop-select')
                    .setPlaceholder('Select loop option')
                    .addOptions([
                        {
                            label: 'Loop Current Track',
                            value: 'track',
                        },
                        {
                            label: 'Loop Entire Queue',
                            value: 'queue',
                        },
                        {
                            label: 'Disable Loop',
                            value: 'off',
                        },
                    ])
            );

        if (!client.loopSelections) {
            client.loopSelections = new Map();
        }
        await interaction.reply({
            content: 'Please select an option to loop:',
            components: [row],
            ephemeral: true
        });
        client.loopSelections.set(interaction.user.id, interaction.id);
        
    }
}).toJSON(); 