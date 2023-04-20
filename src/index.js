const fs = require('node:fs');
const path = require('node:path');
const ytdl = require('ytdl-core-discord')

const { Client, Collection, Events, GatewayIntentBits, REST, Routes } = require('discord.js');
const { createAudioResource, entersState, createAudioPlayer, NoSubscriberBehavior, getVoiceConnection, VoiceConnectionStatus, joinVoiceChannel } = require('@discordjs/voice');
const { CLIENT_ID, CLIENT_TOKEN } = require('./config.json');
const { consoleColors } = require('./util/consoleColors.js');

const queueManager = require('./util/queueManager');


// Initialized client with intents
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates], autoReconnect: true, presence: "idle" });


// Data Constants
const dlPath = path.join(__dirname.replace('src', 'res'), 'dl')
const localCachePath = path.join(__dirname.replace('src', 'res'), 'local_cache')
const serverDataPath = path.join(__dirname.replace('src', 'res'), 'server_data')
const validUrl = "https://www.youtube.com/watch?v=__id__"

// Command Initialization
const commands = [];
client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
	const filePath = path.join(commandsPath, file);
	const command = require(filePath);
	
	commands.push(command.data.toJSON());

	if ('data' in command && 'execute' in command) {
		client.commands.set(command.data.name, command);
	} else {
		console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
	}
}


client.once(Events.ClientReady, () => {
	console.log(consoleColors.FG_GREEN+'Ready!');

	clearCaches()
});


client.on(Events.ShardDisconnect, (closeEvent, shardId) => {
	getVoiceConnection(closeEvent.guild).destroy()
})


client.on(Events.InteractionCreate, async interaction => {
	if (!interaction.isChatInputCommand()) return;

	const command = interaction.client.commands.get(interaction.commandName);

	initData(interaction.guild.id)

	if (!command) {
		console.error(`No command matching ${interaction.commandName} was found.`);
		return;
	}

	try {
		console.log(consoleColors.FG_MAGENTA+`[index.js]: Executing ${interaction.commandName}`);
		await command.execute(interaction);

		// If `play.js` executed correctly
		if (interaction.commandName == "play") {
			const member = await interaction.guild.members.fetch(interaction.member.id);
			const voiceState = member.voice
			const connection = (() => {
				const oldConnection = getVoiceConnection(voiceState.guild.id)
				if (oldConnection) {
					return oldConnection
				} else {
					return joinVoiceChannel({
						channelId: voiceState.channelId,
						guildId: voiceState.guild.id,
						adapterCreator: voiceState.guild.voiceAdapterCreator,
					})
				}
			})();
	
			// Change the voice state and join the voice channel. This will be picked up in `index.js` so the queue will actually start playing.
			
			if (!connection) return

			// Get first in queue
			const queue = queueManager.getFirstInQueue(interaction.guild.id)

			// Setup
			const fileUrl  = validUrl.replace('__id__', queue)
			const resource = createAudioResource(await ytdl(fileUrl, {filter: 'audioonly',  type: 'webm'}))
			const player = createAudioPlayer({
				behaviors: {
					noSubscriber: NoSubscriberBehavior.Pause,
				},
			});

			player.play(resource)
			connection.subscribe(player)

			// Error handling
			player.on('error', error => {
				console.log(error)
			});

			connection.on(VoiceConnectionStatus.Ready, async (event) => {
				console.log(consoleColors.FG_YELLOW+`[index.js]: Opened connection with VoiceChannel|${interaction.channel.id}!`)
			})

			connection.on(VoiceConnectionStatus.Signalling, async () => {
				console.log(consoleColors.FG_YELLOW+`[index.js]: Signalling ... VoiceChannel|${interaction.channel.id}`)
			})
			
			connection.on(VoiceConnectionStatus.Disconnected, async (oldState, newState) => {
				console.log(consoleColors.FG_RED+`[index.js]: Disconnected from VoiceChannel|${interaction.channel.id}!`)
	
				try {
					console.log(consoleColors.FG_RED+`[index.js]: Attempting to reconnect with VoiceChannel|${interaction.channel.id}!`)
					await Promise.race([
						entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
						entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
					]);
					// Seems to be reconnecting to a new channel - ignore disconnect
				} catch (error) {
					// Seems to be a real disconnect which SHOULDN'T be recovered from
					console.log(consoleColors.FG_RED+`[index.js]: Failed reconnection with VoiceChannel|${interaction.channel.id}!`)
					player.stop()
					connection.destroy();
				}
			})

			// Cleanup
		}
	} catch (error) {
		console.error(error);
		if (interaction.replied || interaction.deferred) {
			await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
		} else {
			await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
		}
	}
});


// Construct and prepare an instance of the REST module
const rest = new REST().setToken(CLIENT_TOKEN);

// and deploy your commands!
(async () => {
	try {
		console.log(consoleColors.FG_GRAY+`Started refreshing ${commands.length} application (/) commands.`);

		// The put method is used to fully refresh all commands in the guild with the current set
		await rest.put(
			Routes.applicationCommands(CLIENT_ID),
			{ body: commands },
		);

		console.log(consoleColors.FG_GRAY+`Successfully reloaded ${commands.length} application (/) commands.`);
	} catch (error) {
		// And of course, make sure you catch and log any errors!
		console.error(error);
	}
})();


function hasData(serverId) {
	const serverDataFilePath = path.join(serverDataPath, serverId + '.json')
	return (fs.existsSync(serverDataFilePath))
}


function initData(serverId) {
	const localCacheFilePath = path.join(localCachePath, serverId + '.json')
	const serverDataFilePath = path.join(serverDataPath, serverId + '.json')

	fs.writeFileSync(localCacheFilePath, '{ "queue": [], "looping": false, "queue_looping": false }')

	if (!hasData(serverId)) {
		fs.writeFileSync(serverDataFilePath, '{ "playlists": [] }')
		console.log(`[index.js]: Guild|${serverId}'s data initialized`)
	}
}


function clearCaches() {
	// Find removeable files
	let removeableFiles = []

	const cachedFiles = fs.readdirSync(localCachePath)
	const videoFiles = fs.readdirSync(dlPath)

	for (let file in cachedFiles) { 
		// Remove everything but the example file
		if (cachedFiles[file] == 'example.json') continue;
		
		removeableFiles.push(path.join(localCachePath, cachedFiles[file])) 
	}

	for (let file in videoFiles) { 
		removeableFiles.push(path.join(dlPath, videoFiles[file])) 
	}

	// Remove files
	for (const file in removeableFiles) {
		fs.rmSync(removeableFiles[file])
	}
}


client.login(CLIENT_TOKEN);