const { PermissionFlagsBits, MessageFlags } = require("discord.js");
const DiscordBot = require("../../client/DiscordBot");
const Component = require("../../structure/Component");
const { checkDocument } = require("../../utils/mongodb");

module.exports = new Component({
    customId: 'privacy',
    type: 'button',
    /**
     * @param {DiscordBot} client 
     * @param {import("discord.js").ButtonInteraction} interaction 
     */
    run: async (client, interaction) => {
        try {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });

            const member = interaction.member;
            const voiceChannel = member.voice.channel;

            if (!voiceChannel) {
                return await interaction.editReply({
                    content: "❌ You must be in a voice channel to use this button!",
                });
            }

            const guildId = interaction.guild.id;
            const settings = await checkDocument('voice_channels', { _id: guildId });

            if (!settings?.temp_channels) {
                return await interaction.editReply({
                    content: "❌ No temporary voice channels configured!",
                });
            }

            const isOwner = settings.temp_channels.some(
                temp => temp.TempChannel === voiceChannel.id && temp.Owner === member.id
            );

            if (!isOwner) {
                return await interaction.editReply({
                    content: "❌ Only the voice channel owner can change privacy settings!",
                });
            }

            // Double-check bot permissions
            if (!voiceChannel.permissionsFor(interaction.guild.members.me).has(PermissionFlagsBits.ManageChannels)) {
                return await interaction.editReply({
                    content: "❌ I don’t have **Manage Channels** permission for this voice channel.",
                });
            }

            const everyoneRole = interaction.guild.roles.everyone;
            const currentEveryonePerms = voiceChannel.permissionOverwrites.cache.get(everyoneRole.id);
            const isPrivate = currentEveryonePerms?.deny.has(PermissionFlagsBits.ViewChannel);

            if (isPrivate) {
                // Make channel public
                await voiceChannel.permissionOverwrites.edit(everyoneRole, {
                    ViewChannel: null // reset
                });

                await interaction.editReply({
                    content: "✅ Channel is now **public**! Everyone can see this channel."
                });
            } else {
                // Make channel private
                await voiceChannel.permissionOverwrites.edit(everyoneRole, {
                    ViewChannel: false
                });

                // Ensure owner still has access
                await voiceChannel.permissionOverwrites.edit(member.id, {
                    ViewChannel: true
                });

                await interaction.editReply({
                    content: "✅ Channel is now **private**! Only you can see this channel."
                });
            }

        } catch (error) {
            if (error.code === 10062 || error.message.includes("Unknown interaction")) return;
            console.error("Error in privacy button:", error);

            try {
                await interaction.editReply({
                    content: "❌ An unexpected error occurred while changing privacy settings!",
                });
            } catch {}
        }
    }
}).toJSON();
