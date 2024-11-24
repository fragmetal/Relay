const DiscordBot = require("../../client/DiscordBot");
const Component = require("../../structure/Component");
const { ChannelType, PermissionFlagsBits } = require('discord.js');
const { insertDocument } = require('../../utils/mongodb');

module.exports = new Component({
    customId: 'create-channels',
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

        // Fetch the bot member to check permissions
        let botMember;
        try {
            botMember = await interaction.guild.members.fetch(client.user.id);
        } catch (error) {
            console.error("Failed to fetch bot member data:", error);
            return await interaction.editReply({ content: "Failed to fetch bot member data." });
        }

        // Check if the bot has the MANAGE_CHANNELS permission
        if (!botMember.permissions.has(PermissionFlagsBits.ManageChannels)) {
            return await interaction.editReply({ content: "I do not have permission to manage channels." });
        }

        // Logic for creating channels
        try {
            const newCategoryChannel = await interaction.guild.channels.create({
                name: 'Temp Channels',
                type: ChannelType.GuildCategory,
                permissionOverwrites: [
                    {
                        id: interaction.guild.id,
                        allow: [PermissionFlagsBits.ViewChannel],
                        deny: [PermissionFlagsBits.SendMessages],
                    },
                    {
                        id: client.user.id,
                        allow: [PermissionFlagsBits.ManageChannels, PermissionFlagsBits.MoveMembers, PermissionFlagsBits.ViewChannel],
                    },
                ],
            });

            const channelsToCreate = [
                { name: 'dashboard', type: ChannelType.GuildText },
                { name: 'gamechat', type: ChannelType.GuildText },
                { name: 'Join To Create', type: ChannelType.GuildVoice }
            ];

            const createdChannels = [];

            for (const channelData of channelsToCreate) {
                const channel = await interaction.guild.channels.create({
                    name: channelData.name,
                    type: channelData.type,
                    parent: newCategoryChannel.id,
                    permissionOverwrites: [
                        {
                            id: interaction.guild.id,
                            allow: [PermissionFlagsBits.ViewChannel],
                            deny: [PermissionFlagsBits.SendMessages],
                        },
                        {
                            id: client.user.id,
                            allow: [PermissionFlagsBits.ManageChannels, 
                                PermissionFlagsBits.ManagePermissions, 
                                PermissionFlagsBits.MoveMembers, 
                                PermissionFlagsBits.ViewChannel, 
                                PermissionFlagsBits.SendMessages
                            ],
                        },
                    ],
                });
                createdChannels.push(channel);
            }

            const dbDocument = {
                _id: interaction.guild.id,
                gamechat: createdChannels.find(c => c.name === 'gamechat').id,
                JoinCreate: createdChannels.find(c => c.name === 'Join To Create').id,
                vc_dashboard: createdChannels.find(c => c.name === 'dashboard').id,
                categoryChannelId: newCategoryChannel.id,
            };

            const saveResult = await insertDocument('voice_channels', dbDocument);
            await interaction.editReply({ content: `Channels created successfully. Save result ID: ${saveResult.insertedId}.`, components: [] });
        } catch (error) {
            console.error('Error creating channels:', error);
            await interaction.editReply({ content: 'Failed to create channels. Please try again.', components: [] });
        }
    }
}).toJSON(); 