const { info, success, error } = require("../../utils/Console");
const Event = require("../../structure/Event");
const { updateDocument, checkDocument } = require("../../utils/mongodb");
const { PermissionFlagsBits, ChannelType } = require('discord.js');

module.exports = new Event({
    event: 'voiceStateUpdate',
    once: false,
    run: async (client, oldState, newState) => {
        const guildId = newState.guild.id;
        const channelId = newState.channelId;
        const settings = await checkDocument('voice_channels', { _id: guildId });
        if (!settings?.JoinCreate) {
            return error("Settings not found or JoinCreate not set.");
        }

        if (oldState.channel && oldState.channel.members.size === 0) {
            const channel = oldState.channel;
            const channelData = await checkDocument('voice_channels', { _id: guildId });
            if (channel.id !== settings.JoinCreate && channel.id !== newState.guild.afkChannelId && channelData.temp_channels.some(temp => temp.TempChannel === channel.id)) {
                try {
                    const botMember = await channel.guild.members.fetch(client.user.id);
                    if (!botMember.permissions.has(PermissionFlagsBits.ManageChannels)) {
                        console.error("The bot does not have permission to delete channels.");
                        return;
                    }

                    await channel.delete();

                    await updateDocument('voice_channels', { _id: guildId }, { $pull: { temp_channels: { TempChannel: channel.id } } });
                } catch (err) {
                    console.error(`Failed to delete empty channel: ${channel.name}`, err);
                }
            }
        }
        if (channelId !== settings.JoinCreate) return;
        const botMember = await newState.guild.members.fetch(client.user.id);
        if (!botMember.permissions.has(PermissionFlagsBits.ManageChannels)) {
            return error("The bot does not have permission to manage channels.");
        }

        const member = newState.member;
        const channelName = member?.displayName ? `🔗 | ${member.displayName}'s` : "🔗 | Default Channel";
        const categoryChannel = settings.categoryChannelId;

        if (!categoryChannel) {
            return error("The channel does not have a parent category.");
        }

        const category = await newState.guild.channels.fetch(categoryChannel);
        if (!category || category.type !== ChannelType.GuildCategory) {
            return error("The specified category is invalid.");
        }

        if (!botMember.permissionsIn(category).has(PermissionFlagsBits.ManageChannels)) {
            return error("The bot does not have permission to create channels in the specified category.");
        }

        const newChannel = await newState.guild.channels.create({
            name: channelName,
            type: ChannelType.GuildVoice,
            parent: categoryChannel,
            permissionOverwrites: [
                {
                    id: client.user.id,
                    allow: [
                        PermissionFlagsBits.ManageChannels,
                        PermissionFlagsBits.SendMessages,
                        PermissionFlagsBits.ViewChannel,
                        PermissionFlagsBits.ReadMessageHistory,
                        PermissionFlagsBits.EmbedLinks,
                        PermissionFlagsBits.AttachFiles,
                        PermissionFlagsBits.UseExternalEmojis,
                        PermissionFlagsBits.AddReactions,
                        PermissionFlagsBits.MoveMembers
                    ],
                },
                {
                    id: newState.guild.roles.everyone.id,
                    allow: [
                        PermissionFlagsBits.ViewChannel,
                        PermissionFlagsBits.Connect,
                        PermissionFlagsBits.Speak
                    ],
                }
            ],
        });

        if (!newChannel) {
            return error("Failed to create new channel.");
        }

        await updateDocument('voice_channels', { _id: guildId }, { $push: { temp_channels: { Owner: member.id, TempChannel: newChannel.id, Created: new Date() } } });

        if (!botMember.permissions.has(PermissionFlagsBits.MoveMembers)) {
            return error("The bot does not have permission to move members.");
        }

        if (newState.channelId) {
            await member.voice.setChannel(newChannel);
        }
    }
}).toJSON();
