const { SlashCommandBuilder } = require('discord.js');
const { numberGuess } = require('../games/number-guess.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('game')
        .setDescription('Play various minigames')
        .addSubcommand(subcommand =>
            subcommand
                .setName('number-guess')
                .setDescription('Guess the number between 1-100')
                .addIntegerOption(option =>
                    option.setName('difficulty')
                        .setDescription('Choose difficulty level')
                        .addChoices(
                            { name: 'Easy (1-50)', value: 50 },
                            { name: 'Medium (1-100)', value: 100 },
                            { name: 'Hard (1-200)', value: 200 }
                        )
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('List available minigames')),
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'number-guess') {
            // Call the number guessing game
            await numberGuess.execute(interaction);
        } else if (subcommand === 'list') {
            await interaction.reply(
                `🎮 **Available Minigames:**\n\n` +
                `1. **Number Guess** - Guess the secret number!\n` +
                `   - Use: /game number-guess\n` +
                `   - Features: Multiple difficulty levels, hints, attempt limits\n\n` +
                `2. **Trivia** - Test your knowledge!\n` +
                `   - Use: /trivia\n` +
                `   - Features: 10 questions, scoring, various categories\n\n` +
                `More games coming soon! 🚀`
            );
        }
    },
};