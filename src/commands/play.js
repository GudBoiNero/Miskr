const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs')
const ytsr = require('ytsr')
const ytdl = require('ytdl-core');
const { stringify } = require('querystring');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('play')
        .addStringOption((option) =>
            option.setName('query').setDescription('Youtube query').setRequired(true),
        )
        .setDescription('Replies with Pong!'),
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
        
        const query = getOption('query')
        console.log(`[play.js]: Searching for '${query}'`)
        const results = await ytsr(query, {"pages": 1}) 
        const firstResult = results.items[0]
        console.log(`[play.js]: Found '${firstResult.name}' ${firstResult.url}`)

        if (!firstResult) return; 

        await interaction.reply(`**Added to queue:** ${firstResult.url}`)

        
    }
};