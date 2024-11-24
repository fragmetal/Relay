const { ButtonInteraction } = require("discord.js");
const DiscordBot = require("../../client/DiscordBot");
const Component = require("../../structure/Component");

module.exports = new Component({
    customId: 'set-volume-button', // Custom ID for the button
    type: 'button',
    /**
     * 
     * @param {DiscordBot} client 
     * @param {ButtonInteraction} interaction 
     */
    run: async (client, interaction) => {
        // Open the modal when the button is clicked
        await interaction.showModal({
            custom_id: 'volume-modal', // Custom ID for the modal
            title: 'Set Volume',
            components: [
                {
                    type: 1, // Action row
                    components: [
                        {
                            type: 4, // Text input
                            custom_id: 'volume-input', // Custom ID for the input field
                            label: 'Enter volume (0-100)',
                            style: 1, // Short input
                            placeholder: 'Volume',
                            required: true
                        }
                    ]
                }
            ]
        });
    }
}).toJSON();
