const { SlashCommandBuilder } = require('discord.js');

const numberGuess = {
    data: new SlashCommandBuilder()
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
                .setRequired(false)),
    async execute(interaction) {
        try {
            const difficulty = interaction.options.getInteger('difficulty') || 100;
            const secretNumber = Math.floor(Math.random() * difficulty) + 1;
            let attempts = 0;
            const maxAttempts = Math.ceil(difficulty / 20);

            await interaction.reply(
                `🎮 Number Guessing Game Started!\n` +
                `I'm thinking of a number between 1 and ${difficulty}.\n` +
                `You have ${maxAttempts} attempts to guess it!\n\n` +
                `Reply with your guess!`
            );

            const filter = m => m.author.id === interaction.user.id;
            const collector = interaction.channel.createMessageCollector({ 
                filter, 
                time: 60000,
                max: maxAttempts 
            });

            collector.on('collect', async m => {
                attempts++;
                const guess = parseInt(m.content);

                if (isNaN(guess)) {
                    m.reply('Please enter a valid number!');
                    return;
                }

                if (guess === secretNumber) {
                    collector.stop();
                    await interaction.followUp(
                        `🎉 Congratulations! You guessed the number ${secretNumber} in ${attempts} attempt${attempts > 1 ? 's' : ''}!`
                    );
                } else if (attempts >= maxAttempts) {
                    collector.stop();
                    await interaction.followUp(
                        `😢 Game Over! The number was ${secretNumber}. Better luck next time!`
                    );
                } else {
                    const remaining = maxAttempts - attempts;
                    const hint = guess < secretNumber ? 'higher' : 'lower';
                    await m.reply(
                        `Wrong! The number is ${hint} than ${guess}. ${remaining} attempt${remaining > 1 ? 's' : ''} remaining.`
                    );
                }
            });

            collector.on('end', (collected, reason) => {
                if (reason === 'time') {
                    interaction.followUp(
                        `⏰ Time's up! The number was ${secretNumber}.`
                    );
                }
            });

        } catch (error) {
            console.error('Number guess error:', error);
            interaction.reply('An error occurred while starting the game.');
        }
    },
};

module.exports = { numberGuess };