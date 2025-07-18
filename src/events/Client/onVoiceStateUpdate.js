const { info, success, error } = require("../../utils/Console");
const Event = require("../../structure/Event");
const { updateDocument, checkDocument } = require("../../utils/mongodb");
const { PermissionFlagsBits, ChannelType, PermissionsBitField } = require('discord.js');

// Cache for delayed deletion tasks
const deletionQueue = new Map();

// Cooldown tracker
const cooldowns = new Map();

module.exports = new Event({
    event: 'voiceStateUpdate',
    once: false,
    run: async (client, oldState, newState) => {
        const guild = newState.guild;
        const settings = await checkDocument('voice_channels', { _id: guild.id });
        
        // Validate settings
        if (!settings?.JoinCreate) {
            return error(`[${guild.name}] JoinCreate feature disabled`);
        }

        // ======================
        // 1. EMPTY CHANNEL CLEANUP
        // ======================
        if (oldState.channel && oldState.channel.members.size === 0) {
            const channel = oldState.channel;
            const isTempChannel = settings.temp_channels?.some(temp => temp.TempChannel === channel.id);
            
            if (channel.id !== settings.JoinCreate && 
                channel.id !== guild.afkChannelId &&
                isTempChannel) {
                
                // Clear existing deletion task if any
                if (deletionQueue.has(channel.id)) {
                    clearTimeout(deletionQueue.get(channel.id));
                }

                const deletionPromise = (async () => {
                    try {
                        const botMember = await guild.members.fetchMe();
                        
                        // Validate permissions
                        if (!botMember.permissions.has(PermissionFlagsBits.ManageChannels)) {
                            return error(`[${guild.name}] Missing ManageChannels permission`);
                        }
                
                        // Re-fetch to ensure channel is still empty
                        const freshChannel = await guild.channels.fetch(channel.id).catch(() => null);
                        if (!freshChannel || freshChannel.members.size > 0) return;
                
                        await freshChannel.delete();
                        await updateDocument('voice_channels', { _id: guild.id }, { 
                            $pull: { temp_channels: { TempChannel: channel.id } } 
                        });
                
                        deletionQueue.delete(channel.id);
                        success(`[${guild.name}] Deleted empty channel: ${channel.name}`);
                    } catch (err) {
                        error(`[${guild.name}] Failed to delete channel ${channel.name}:`, err);
                    }
                })();
                deletionQueue.set(channel.id, deletionPromise);
            }
        }

        // ======================
        // 2. NEW CHANNEL CREATION
        // ======================
        if (newState.channelId === settings.JoinCreate) {
            try {
                const member = newState.member;
                const botMember = await guild.members.fetchMe();
                const userKey = `${guild.id}-${member.id}`;
                
                // Cooldown configuration
                const cooldownConfig = {
                    duration: settings.cooldownDuration || 15000,  // Default 15 seconds
                    maxAttempts: 3,                                // Max attempts before penalty
                    penaltyDuration: 60000                          // 1 minute penalty
                };
                
                const now = Date.now();
                
                // Handle cooldowns
                if (cooldowns.has(userKey)) {
                    const entry = cooldowns.get(userKey);
                    
                    // Check if still in cooldown
                    if (now < entry.expiresAt) {
                        const timeLeft = Math.ceil((entry.expiresAt - now) / 1000);
                        
                        // Send user feedback in server
                        try {
                            const joinCreateChannel = guild.channels.cache.get(settings.JoinCreate);
                            if (joinCreateChannel && joinCreateChannel.isVoiceBased()) {
                                joinCreateChannel.send({
                                    content: `${member}, ⏱️ You're on cooldown! Try again in ${timeLeft} seconds.`,
                                }).catch(() => {});
                            }
                        } catch (channelError) {
                            // Fallback to DM if voice message fails
                            try {
                                await member.send({
                                    content: `⏱️ You're on cooldown! Try again in ${timeLeft} seconds.`,
                                });
                            } catch (dmError) {}
                        }
                        
                        return error(`[${guild.name}] ${member.displayName} on cooldown (${timeLeft}s)`);
                    }
                    
                    // Reset attempts if penalty period expired
                    if (now > entry.penaltyExpiry) {
                        cooldowns.delete(userKey);
                    }
                }
                
                // Permission check
                const requiredPermissions = [
                    PermissionFlagsBits.ManageChannels,
                    PermissionFlagsBits.MoveMembers
                ];
                
                if (!botMember.permissions.has(requiredPermissions)) {
                    return error(`[${guild.name}] Missing required permissions`);
                }

                // Validate category
                const categoryId = settings.categoryChannelId;
                if (!categoryId) {
                    return error(`[${guild.name}] Category channel not configured`);
                }

                const category = await guild.channels.fetch(categoryId);
                if (!category || category.type !== ChannelType.GuildCategory) {
                    return error(`[${guild.name}] Invalid category channel`);
                }

                // Validate category permissions
                if (!botMember.permissionsIn(category).has(PermissionFlagsBits.ManageChannels)) {
                    return error(`[${guild.name}] Missing category permissions`);
                }

                // Get the JoinCreate channel for permission inheritance
                const joinCreateChannel = guild.channels.cache.get(settings.JoinCreate);
                if (!joinCreateChannel) {
                    return error(`[${guild.name}] JoinCreate channel not found`);
                }

                // Channel name sanitization
                const sanitizedName = `🔗 ${member.displayName.replace(/[^\w\s\u{1F300}-\u{1F5FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}]/giu, '')}'s Room`
                    .substring(0, 100); // Discord's 100-char limit
                
                // Start with JoinCreate channel's permission overwrites
                const permissionOverwrites = Array.from(joinCreateChannel.permissionOverwrites.cache.values());
                
                // Add/update bot permissions
                const botOverwriteIndex = permissionOverwrites.findIndex(o => o.id === client.user.id);
                if (botOverwriteIndex !== -1) {
                    // Update existing bot overwrite
                    const existing = permissionOverwrites[botOverwriteIndex];
                    permissionOverwrites[botOverwriteIndex] = {
                        ...existing,
                        allow: new PermissionsBitField(existing.allow)
                            .add(PermissionFlagsBits.ManageChannels)
                            .add(PermissionFlagsBits.MoveMembers)
                    };
                } else {
                    // Create new bot overwrite
                    permissionOverwrites.push({
                        id: client.user.id,
                        allow: [
                            PermissionFlagsBits.ManageChannels,
                            PermissionFlagsBits.MoveMembers
                        ],
                    });
                }
                
                // Add/update user permissions
                const userOverwriteIndex = permissionOverwrites.findIndex(o => o.id === member.id);
                if (userOverwriteIndex !== -1) {
                    // Update existing user overwrite
                    const existing = permissionOverwrites[userOverwriteIndex];
                    permissionOverwrites[userOverwriteIndex] = {
                        ...existing,
                        allow: new PermissionsBitField(existing.allow)
                            .add(PermissionFlagsBits.ManageChannels)
                            .add(PermissionFlagsBits.MoveMembers)
                    };
                } else {
                    // Create new user overwrite
                    permissionOverwrites.push({
                        id: member.id,
                        allow: [
                            PermissionFlagsBits.ManageChannels,
                            PermissionFlagsBits.MoveMembers
                        ],
                    });
                }

                // Create new channel with inherited permissions
                const newChannel = await guild.channels.create({
                    name: sanitizedName,
                    type: ChannelType.GuildVoice,
                    parent: categoryId,
                    permissionOverwrites: permissionOverwrites,
                });

                // Update database
                await updateDocument('voice_channels', { _id: guild.id }, {
                    $push: {
                        temp_channels: {
                            Owner: member.id,
                            TempChannel: newChannel.id,
                            Created: new Date()
                        }
                    }
                });

                // Move user to new channel
                if (newState.channelId === settings.JoinCreate) {
                    await member.voice.setChannel(newChannel).catch(err => {
                        error(`[${guild.name}] Failed to move member:`, err);
                    });
                }

                // Apply cooldown
                const attemptCount = (cooldowns.get(userKey)?.attempts || 0) + 1;
                const isPenalty = attemptCount >= cooldownConfig.maxAttempts;
                
                cooldowns.set(userKey, {
                    expiresAt: now + (isPenalty ? cooldownConfig.penaltyDuration : cooldownConfig.duration),
                    penaltyExpiry: now + 120000, // 2 minutes before resetting attempts
                    attempts: attemptCount
                });
                
                // Schedule cooldown cleanup
                setTimeout(() => {
                    if (cooldowns.has(userKey) && cooldowns.get(userKey).expiresAt <= Date.now()) {
                        cooldowns.delete(userKey);
                    }
                }, isPenalty ? cooldownConfig.penaltyDuration : cooldownConfig.duration);

                success(`[${guild.name}] Created channel for ${member.displayName} (${isPenalty ? 'penalty cooldown' : 'normal cooldown'})`);
            } catch (err) {
                error(`[${guild.name}] Channel creation failed:`, err);
            }
        }
    }
}).toJSON();
