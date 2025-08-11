const { SlashCommandBuilder } = require('discord.js');
const axios = require('axios');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('trivia')
        .setDescription('Start a trivia game with 10 questions'),
    async execute(interaction) {
        try {
            // Fetch questions from OpenTDB API
            const response = await axios.get('https://opentdb.com/api.php?amount=10');
            const questions = response.data.results;
            
            if (!questions || questions.length === 0) {
                return interaction.reply('Failed to fetch trivia questions. Please try again later.');
            }

            // Start trivia session
            await interaction.reply('Starting trivia game! Get ready...');
            
            // Store current question index and score
            let currentQuestion = 0;
            let score = 0;
            
            // Function to ask next question
            const askQuestion = async () => {
                if (currentQuestion >= questions.length) {
                    return interaction.followUp(`Game over! Your final score is ${score}/${questions.length}`);
                }
                
                const question = questions[currentQuestion];
                const answers = [
                    ...question.incorrect_answers,
                    question.correct_answer
                ].sort(() => Math.random() - 0.5);
                
                const answerList = answers.map((a, i) => `${i+1}. ${a}`).join('\n');
                
                await interaction.followUp(
                    `Question ${currentQuestion + 1}: ${question.question}\n` +
                    `Category: ${question.category}\n` +
                    `Difficulty: ${question.difficulty}\n\n` +
                    `${answerList}\n\n` +
                    `Reply with the number of your answer!`
                );
                
                // Collect user's answer
                const filter = m => m.author.id === interaction.user.id;
                const collector = interaction.channel.createMessageCollector({ filter, time: 15000 });
                
                collector.on('collect', m => {
                    const answerNum = parseInt(m.content);
                    if (isNaN(answerNum) || answerNum < 1 || answerNum > answers.length) {
                        m.reply('Please enter a valid number!');
                        return;
                    }
                    
                    const selectedAnswer = answers[answerNum - 1];
                    if (selectedAnswer === question.correct_answer) {
                        score++;
                        m.reply('Correct! 🎉');
                    } else {
                        m.reply(`Wrong! The correct answer was: ${question.correct_answer}`);
                    }
                    
                    collector.stop();
                    currentQuestion++;
                    askQuestion();
                });
                
                collector.on('end', collected => {
                    if (collected.size === 0) {
                        interaction.followUp('Time\'s up! Moving to next question...');
                        currentQuestion++;
                        askQuestion();
                    }
                });
            };
            
            // Start asking questions
            askQuestion();
            
        } catch (error) {
            console.error('Trivia error:', error);
            interaction.reply('An error occurred while starting the trivia game.');
        }
    },
};