const { SlashCommandBuilder } = require('discord.js');
const { joinVoiceChannel, VoiceConnectionStatus, getVoiceConnection } = require('@discordjs/voice')
const path = require('node:path')
const ytsr = require('ytsr')
const ytdl = require('ytdl-core');
const queueManager = require('../util/queueManager');

const dlPath = path.join(__dirname.replace('src', 'res').replace('commands', ''), 'dl')

module.exports = {
    data: new SlashCommandBuilder()
        .setName('play')
        .addStringOption((option) =>
            option.setName('query').setDescription('Youtube query').setRequired(true),
        )
        .setDescription('Finds a youtube video based on your query, and plays it in your current voice channel.'),
    async execute(interaction, args = {}) {
        if (typeof (args) != typeof ({})) return;
        
        const member = await interaction.guild.members.fetch(interaction.member.id);
        const voiceChannel = member.voice
        console.log(voiceChannel)

        if (!voiceChannel) {
            await interaction.deferReply({ephemeral: true})

            return interaction.editReply('You must be in a voice channel to use this command.')
        };

        // Change the voice state and join the voice channel. This will be picked up in `index.js` so the queue will actually start playing.
        const connection = joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: voiceChannel.guild.id,
            adapterCreator: voiceChannel.guild.voiceAdapterCreator,
        });
        
        connection.on(VoiceConnectionStatus.Connecting, (oldState, newState) => {
            console.log(`[play.js]: Establishing connection with VoiceChannel|${interaction.channel.id}!`)
        })


        // Get an option from the interaction
        let getOption = (optionName) => {
            for (optionIndex in interaction.options.data) {
                let option = interaction.options.data[optionIndex]
                if (option.name == optionName) {
                    return option.value
                };
            }
        }
        
        const query = getOption('query')
        console.log(`[play.js]: Searching for '${query}'`)

        const results = await ytsr(query, {"pages": 1}) 
        const result = results.items[0]
        console.log(`[play.js]: Found '${result.title}' ${result.url}`)

        if (!result) return; 

        await interaction.reply(`**Added to queue:** ${result.url}`)

        queueManager.addToQueue(interaction.guildId, result.url)

        //const videoPath = path.join(dlPath, `${result.id}.webm`)
        //const download = ytdl(result.url, {quality: 'highestaudio', format: 'webm'})
        //download.pipe(fs.createWriteStream(videoPath))
    }
};