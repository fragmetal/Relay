const DiscordBot = require("../../client/DiscordBot");
const Component = require("../../structure/Component");
const { checkDocument, deleteDocument } = require('../../utils/mongodb');

module.exports = new Component({
    customId: 'delete-channels',
    type: 'button',
    /**
     * 
     * @param {DiscordBot} client 
     * @param {import("discord.js").ButtonInteraction} interaction 
     */
    run: async (client, interaction) => {
        if (!interaction.guild) {
            return await interaction.reply({ content: "This command can only be used in a server.", ephemeral: true });
        }

        await interaction.deferReply({ ephemeral: true }); // Acknowledge the interaction

        // Logic for deleting channels
        const existingDocument = await checkDocument('voice_channels', { _id: interaction.guild.id });

        if (!existingDocument) {
            return await interaction.editReply({ content: 'No configuration found for this server.', components: [] });
        }

        const channelsToDelete = [
            existingDocument.vc_dashboard,
            existingDocument.JoinCreate,
            existingDocument.gamechat,
            existingDocument.categoryChannelId
        ];

        const deletePromises = channelsToDelete.map(async (channelId) => {
            const channelToDelete = interaction.guild.channels.cache.get(channelId);
            if (channelToDelete) {
                await channelToDelete.delete();
            }
        });

        await Promise.all(deletePromises);
        await deleteDocument('voice_channels', { _id: interaction.guild.id });
        await interaction.editReply({ content: 'All specified channels deleted successfully.', components: [] });
    }
}).toJSON(); 