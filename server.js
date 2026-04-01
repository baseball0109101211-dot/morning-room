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

// Helper function to update participants list
const updateParticipants = async () => {
    try {
        if (!process.env.DISCORD_GUILD_ID || !process.env.DISCORD_VOICE_CHANNEL_ID) return;
        
        const guild = await client.guilds.fetch(process.env.DISCORD_GUILD_ID);
        if (!guild) return;

        const channel = await guild.channels.fetch(process.env.DISCORD_VOICE_CHANNEL_ID);
        if (!channel || channel.type !== 2) return; // 2 is GuildVoice

        const members = channel.members.map(member => ({
            id: member.id,
            username: member.user.username,
            displayName: member.displayName,
            avatarURL: member.user.displayAvatarURL({ forceStatic: false, size: 128, extension: 'png' }) || null
        }));

        currentParticipants = members;
        console.log(`[Update] Participants updated: ${members.length} users.`);
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
client.on('voiceStateUpdate', (oldState, newState) => {
    // If the affected channel is our target channel
    if (oldState.channelId === process.env.DISCORD_VOICE_CHANNEL_ID || 
        newState.channelId === process.env.DISCORD_VOICE_CHANNEL_ID) {
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
