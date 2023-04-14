const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, Events, GatewayIntentBits, REST, Routes } = require('discord.js');
const { createAudioResource, createAudioPlayer, AudioPlayerStatus, getVoiceConnection } = require('@discordjs/voice');
const { CLIENT_ID, CLIENT_TOKEN } = require('./config.json');


// Initialized client with intents
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// Data Constants
const dlPath = path.join(__dirname.replace('src', 'res'), 'dl')
const localCachePath = path.join(__dirname.replace('src', 'res'), 'local_cache')
const serverDataPath = path.join(__dirname.replace('src', 'res'), 'server_data')


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
	console.log('Ready!');

	clearCaches()
});


client.on(Events.ShardDisconnect, (closeEvent, shardId) => {
	getVoiceConnection(closeEvent.guild).destroy()
})


client.on(Events.InteractionCreate, async interaction => {
	if (!interaction.isChatInputCommand()) return;

	const command = client.commands.get(interaction.commandName);

	if (!command) return;

	// Initialize local_cache and server_cache for server
	const serverId = interaction.guildId
	initData(serverId)

	try {
		let args = {}

		switch (interaction.commandName) {
			case 'play':
				args['ydl'] = 'ydl'
		}

		await command.execute(interaction, args);
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
		console.log(`Started refreshing ${commands.length} application (/) commands.`);

		// The put method is used to fully refresh all commands in the guild with the current set
		await rest.put(
			Routes.applicationCommands(CLIENT_ID),
			{ body: commands },
		);

		console.log(`Successfully reloaded ${commands.length} application (/) commands.`);
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