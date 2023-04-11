const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('play')
        .addStringOption((option) =>
            option.setName('query').setDescription('Youtube query').setRequired(true),
        )
        .setDescription('Replies with Pong!'),
    async execute(interaction, args = {}) {
        if (typeof (args) != typeof ({})) return interaction.reply(`Interaction failed.`);

        // Get an option from the interaction
        let getOption = (optionName) => {
            for (optionIndex in interaction.options.data) {
                let option = interaction.options.data[optionIndex]
                if (option.name == optionName) {
                    return option.value
                };
            }
        }

        var query = getOption('query')

        return interaction.reply(`**Searching for:** ${query}...`);
    }
};