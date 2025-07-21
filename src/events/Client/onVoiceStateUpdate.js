const { info, success, error } = require("../../utils/Console");
const Event = require("../../structure/Event");
const { updateDocument, checkDocument } = require("../../utils/mongodb");
const { PermissionFlagsBits, ChannelType, PermissionsBitField } = require('discord.js');

// Cooldown persistence (MongoDB)
async function getCooldown(mongo, guildId, userId) {
    const entry = await mongo.collection('voice_cooldowns').findOne({ _id: `${guildId}-${userId}` });
    return entry && entry.expiresAt > Date.now() ? entry : null;
}

async function setCooldown(mongo, guildId, userId, duration) {
    const expiresAt = Date.now() + duration;
    await mongo.collection('voice_cooldowns').updateOne(
        { _id: `${guildId}-${userId}` },
        { $set: { expiresAt } },
        { upsert: true }
    );
}

module.exports = new Event({
    event: 'voiceStateUpdate',
    once: false,
    run: async (client, oldState, newState) => {
        const guild = newState.guild;
        const mongo = client.mongo; // assuming your client exposes a Mongo connection
        const settings = await checkDocument('voice_channels', { _id: guild.id });

        if (!settings?.JoinCreate) return error(`[${guild.name}] JoinCreate feature disabled`);

        // INSTANT DELETE ON EMPTY
        if (oldState.channel && oldState.channel.members.size === 0) {
            const channel = oldState.channel;
            const isTempChannel = settings.temp_channels?.some(temp => temp.TempChannel === channel.id);

            if (channel.id !== settings.JoinCreate &&
                channel.id !== guild.afkChannelId &&
                isTempChannel) {
                
                const botMember = await guild.members.fetchMe();
                if (!botMember.permissions.has(PermissionFlagsBits.ManageChannels)) {
                    return error(`[${guild.name}] Missing ManageChannels permission`);
                }

                await channel.delete().catch(() => {});
                await updateDocument('voice_channels', { _id: guild.id }, {
                    $pull: { temp_channels: { TempChannel: channel.id } }
                });

                success(`[${guild.name}] Instantly deleted empty channel: ${channel.name}`);
            }
        }

        // TEMP CHANNEL CREATION
        if (newState.channelId === settings.JoinCreate) {
            const member = newState.member;
            const botMember = await guild.members.fetchMe();
            const userKey = `${guild.id}-${member.id}`;

            const cooldown = await getCooldown(mongo, guild.id, member.id);
            if (cooldown) {
                await member.voice.disconnect().catch(() => {});
                return error(`[${guild.name}] ${member.displayName} force-disconnected (on cooldown).`);
            }

            const requiredPermissions = [
                PermissionFlagsBits.ManageChannels,
                PermissionFlagsBits.MoveMembers
            ];

            if (!botMember.permissions.has(requiredPermissions)) {
                return error(`[${guild.name}] Missing required permissions`);
            }

            const categoryId = settings.categoryChannelId;
            if (!categoryId) return error(`[${guild.name}] Category channel not configured`);

            const category = await guild.channels.fetch(categoryId).catch(() => null);
            if (!category || category.type !== ChannelType.GuildCategory) {
                return error(`[${guild.name}] Invalid category channel`);
            }

            const joinCreateChannel = guild.channels.cache.get(settings.JoinCreate);
            if (!joinCreateChannel) {
                return error(`[${guild.name}] JoinCreate channel not found`);
            }

            // CONFIGURABLE PERMISSIONS
            const customPermissions = settings.custom_permissions || {};
            const botPerms = new PermissionsBitField();
            (customPermissions.bot || ['ManageChannels', 'MoveMembers']).forEach(perm => botPerms.add(PermissionFlagsBits[perm]));
            const userPerms = new PermissionsBitField();
            (customPermissions.user || ['ManageChannels', 'MoveMembers']).forEach(perm => userPerms.add(PermissionFlagsBits[perm]));

            const sanitizedName = `🔗 ${member.displayName.replace(/[^\w\s\u{1F300}-\u{1F5FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}]/giu, '')}'s Room`
                .substring(0, 100);

            const permissionOverwrites = [
                { id: client.user.id, allow: botPerms },
                { id: member.id, allow: userPerms }
            ];

            const newChannel = await guild.channels.create({
                name: sanitizedName,
                type: ChannelType.GuildVoice,
                parent: categoryId,
                permissionOverwrites
            });

            await updateDocument('voice_channels', { _id: guild.id }, {
                $push: {
                    temp_channels: {
                        Owner: member.id,
                        TempChannel: newChannel.id,
                        Created: new Date()
                    }
                }
            });

            await member.voice.setChannel(newChannel).catch(() => {});
            await setCooldown(mongo, guild.id, member.id, settings.cooldownDuration || 15000);

            success(`[${guild.name}] Created temp channel for ${member.displayName}`);
        }
    }
}).toJSON();
