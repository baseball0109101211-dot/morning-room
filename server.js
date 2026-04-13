import express from 'express';
import { Client, GatewayIntentBits } from 'discord.js';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// Discord Bot Setup
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
    ]
});

// Cache for current participants
let currentParticipants = [];

// Monitored channels configuration
const monitoredChannels = [
    { guildId: process.env.DISCORD_GUILD_ID, channelId: process.env.DISCORD_VOICE_CHANNEL_ID },
    { guildId: process.env.DISCORD_GUILD_ID_2, channelId: process.env.DISCORD_VOICE_CHANNEL_ID_2 },
].filter(ch => ch.guildId && ch.channelId);

// Helper function to fetch members from a single channel
const fetchChannelMembers = async ({ guildId, channelId }) => {
    try {
        const guild = await client.guilds.fetch(guildId);
        if (!guild) return [];

        const channel = await guild.channels.fetch(channelId);
        if (!channel || channel.type !== 2) return []; // 2 is GuildVoice

        return channel.members.map(member => ({
            id: member.id,
            username: member.user.username,
            displayName: member.displayName,
            avatarURL: member.user.displayAvatarURL({ forceStatic: false, size: 128, extension: 'png' }) || null
        }));
    } catch (error) {
        console.error(`Error fetching from guild ${guildId}:`, error);
        return [];
    }
};

// Helper function to update participants list from all channels
const updateParticipants = async () => {
    try {
        const results = await Promise.all(monitoredChannels.map(fetchChannelMembers));
        const allMembers = results.flat();
        // Deduplicate by user ID (in case same user is in both)
        const seen = new Set();
        currentParticipants = allMembers.filter(m => {
            if (seen.has(m.id)) return false;
            seen.add(m.id);
            return true;
        });
        console.log(`[Update] Participants updated: ${currentParticipants.length} users from ${monitoredChannels.length} channels.`);
    } catch (error) {
        console.error('Error fetching participants:', error);
    }
};

client.once('ready', () => {
    console.log(`Bot is Ready! Logged in as ${client.user.tag}`);
    // Check initial state
    updateParticipants();
});

// Listen to voice state updates
const monitoredChannelIds = new Set(monitoredChannels.map(ch => ch.channelId));
client.on('voiceStateUpdate', (oldState, newState) => {
    if (monitoredChannelIds.has(oldState.channelId) || monitoredChannelIds.has(newState.channelId)) {
        updateParticipants();
    }
});

// Login
if (process.env.DISCORD_BOT_TOKEN) {
    client.login(process.env.DISCORD_BOT_TOKEN).catch(err => {
        console.error('Failed to login. Please check DISCORD_BOT_TOKEN.');
    });
} else {
    console.warn('DISCORD_BOT_TOKEN is not set. Bot is not active, but web server will start.');
}


// --- Express API ---
app.get('/api/participants', (req, res) => {
    res.json(currentParticipants);
});

// Start Server
app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
    console.log(`Please make sure .env file has correct tokens and IDs!`);
});
