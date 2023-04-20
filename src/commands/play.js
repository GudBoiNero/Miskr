const { SlashCommandBuilder } = require('discord.js');
const { consoleColors } = require('../util/consoleColors')
const path = require('node:path')
const ytsr = require('ytsr')
const queueManager = require('../util/queueManager');

const dlPath = path.join(__dirname.replace('src', 'res').replace('commands', ''), 'dl')

const validUrl = "https://www.youtube.com/watch?v=__id__"

module.exports = {
    data: new SlashCommandBuilder()
        .setName('play')
        .addStringOption((option) =>
            option.setName('query').setDescription('Youtube query').setRequired(true),
        )
        .setDescription('Finds a youtube video based on your query, and plays it in your current voice channel.'),
    async execute(interaction, args = {}) {
        if (typeof (args) != typeof ({})) return;


        // Get an option from the interaction
        let getOption = (optionName) => {
            for (optionIndex in interaction.options.data) {
                let option = interaction.options.data[optionIndex]
                if (option.name == optionName) {
                    return option.value
                };
            }
        }

        if (!await this.senseChecks(interaction)) return;
        
        
        const query = getOption('query')
        console.log(consoleColors.FG_YELLOW+`[play.js]: Searching for '${query}'`)
        const results = await ytsr(query, {"pages": 1}) 
        const result = results.items[0]
        console.log(consoleColors.FG_GREEN+`[play.js]: Found '${result.title}' ${result.url}`)

        if (!result) return; 
        queueManager.addToQueue(interaction.guildId, result.id)
        await interaction.reply(`**Added to queue:** ${result.url}`)
    },
    async senseChecks(interaction) {
        const member = await interaction.guild.members.fetch(interaction.member.id);
        const voiceState = member.voice

        // Member VoiceState not in Guild of `interaction` or Member VoiceState Channel is not valid
        if ((voiceState.guild.id != voiceState.guild.id) || (!voiceState.channel)) {
            await interaction.deferReply({ephemeral: true})
            await interaction.editReply('You must be in a voice channel to use this command.')
            return false
        }

        // Member VoiceState not in same Channel as Client VoiceState
        
        return true
    }
};

