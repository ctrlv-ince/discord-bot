const { SlashCommandBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const axios = require('axios');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('trivia')
        .setDescription('Start a trivia game with customizable questions')
        .addIntegerOption(option =>
            option.setName('count')
                .setDescription('Number of questions (1-20)')
                .setMinValue(1)
                .setMaxValue(20)
                .setRequired(false)),
    async execute(interaction) {
        try {
            const questionCount = interaction.options.getInteger('count') || 10;
            
            // Fetch questions from OpenTDB API
            const response = await axios.get(`https://opentdb.com/api.php?amount=${questionCount}&type=multiple`);
            const questions = response.data.results;
            
            if (!questions || questions.length === 0) {
                return interaction.reply('Failed to fetch trivia questions. Please try again later.');
            }

            // Start trivia session
            await interaction.reply('🎯 Starting trivia game! Get ready...');
            
            // Store game state
            const gameState = {
                currentQuestion: 0,
                scores: new Map(),
                questions: questions,
                startTime: Date.now(),
                active: true
            };

            // Function to create buttons for answers
            const createButtons = (answers) => {
                const buttons = answers.map((answer, index) => 
                    new ButtonBuilder()
                        .setCustomId(`answer_${index}`)
                        .setLabel(String.fromCharCode(65 + index))
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('🔘')
                );
                
                return new ActionRowBuilder().addComponents(buttons);
            };

            // Function to ask next question
            const askQuestion = async () => {
                if (!gameState.active || gameState.currentQuestion >= gameState.questions.length) {
                    return endGame();
                }
                
                const question = gameState.questions[gameState.currentQuestion];
                const answers = [
                    ...question.incorrect_answers,
                    question.correct_answer
                ].sort(() => Math.random() - 0.5);
                
                const answerList = answers.map((a, i) => `${String.fromCharCode(65 + i)}. ${a}`).join('\n');
                
                const buttons = createButtons(answers);
                
                const questionMsg = await interaction.followUp({
                    content: `**Question ${gameState.currentQuestion + 1} of ${gameState.questions.length}**\n\n` +
                           `📝 ${question.question}\n\n` +
                           `📚 **Category:** ${question.category}\n` +
                           `⭐ **Difficulty:** ${question.difficulty.charAt(0).toUpperCase() + question.difficulty.slice(1)}\n\n` +
                           `🔢 **Choose your answer:**`,
                    components: [buttons],
                    fetchReply: true
                });
                
                // Create button collector
                const filter = i => !i.user.bot;
                const collector = questionMsg.createMessageComponentCollector({ 
                    filter, 
                    time: 30000 
                });
                
                let answered = false;
                let correctAnswerIndex = answers.indexOf(question.correct_answer);
                
                collector.on('collect', async interaction => {
                    if (answered) return;
                    
                    answered = true;
                    collector.stop();
                    
                    const userAnswer = parseInt(interaction.customId.split('_')[1]);
                    const isCorrect = userAnswer === correctAnswerIndex;
                    
                    // Update user score
                    const currentScore = gameState.scores.get(interaction.user.id) || 0;
                    const newScore = isCorrect ? currentScore + 1 : currentScore;
                    gameState.scores.set(interaction.user.id, newScore);
                    
                    // Disable all buttons and show correct answer
                    const disabledButtons = buttons.components.map(button => 
                        button.setDisabled(true)
                             .setStyle(isCorrect && button.customId === `answer_${correctAnswerIndex}` ? 
                                 ButtonStyle.Success : ButtonStyle.Danger)
                             .setEmoji(isCorrect && button.customId === `answer_${correctAnswerIndex}` ? 
                                 '✅' : '❌')
                    );
                    
                    const updatedRow = new ActionRowBuilder().addComponents(disabledButtons);
                    
                    await interaction.update({
                        content: isCorrect ? 
                            `🎉 **Correct!** ${interaction.user.username} gets a point! The answer was ${String.fromCharCode(65 + correctAnswerIndex)}. ${question.correct_answer}` :
                            `❌ **Wrong!** ${interaction.user.username}, the correct answer was **${String.fromCharCode(65 + correctAnswerIndex)}. ${question.correct_answer}**`,
                        components: [updatedRow]
                    });
                    
                    gameState.currentQuestion++;
                    
                    // Ask next question after delay
                    setTimeout(askQuestion, 3000);
                });
                
                collector.on('end', async (collected, reason) => {
                    if (!answered && reason === 'time') {
                        gameState.currentQuestion++;
                        
                        // Disable all buttons and show correct answer
                        const disabledButtons = buttons.components.map(button => 
                            button.setDisabled(true)
                                 .setStyle(button.customId === `answer_${correctAnswerIndex}` ? 
                                     ButtonStyle.Success : ButtonStyle.Secondary)
                                 .setEmoji(button.customId === `answer_${correctAnswerIndex}` ? 
                                     '✅' : '⏰')
                        );
                        
                        const updatedRow = new ActionRowBuilder().addComponents(disabledButtons);
                        
                        await interaction.followUp({
                            content: `⏰ **Time's up!** The correct answer was **${String.fromCharCode(65 + correctAnswerIndex)}. ${question.correct_answer}**`,
                            components: [updatedRow]
                        });
                        
                        setTimeout(askQuestion, 3000);
                    }
                });
            };
            
            // Function to end the game
            const endGame = async () => {
                gameState.active = false;
                const endTime = Date.now();
                const duration = Math.round((endTime - gameState.startTime) / 1000);
                
                // Sort scores by highest first
                const sortedScores = Array.from(gameState.scores.entries())
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 10);
                
                let resultText = '';
                if (sortedScores.length > 0) {
                    resultText = sortedScores
                        .map(([userId, score], index) => {
                            const user = interaction.guild.members.cache.get(userId);
                            const username = user ? user.user.displayName : 'Unknown User';
                            const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
                            return `${medal} **${username}**: ${score}/${gameState.questions.length}`;
                        })
                        .join('\n');
                } else {
                    resultText = 'No one scored points this round. Better luck next time!';
                }
                
                const finalEmbed = {
                    color: 0x00ff00,
                    title: '🏆 **Trivia Game Complete!**',
                    description: `📊 **Game Stats:**\n` +
                               `⏱️ Duration: ${duration} seconds\n` +
                               `❓ Total Questions: ${gameState.questions.length}\n` +
                               `👥 Players: ${sortedScores.length}`,
                    fields: [
                        {
                            name: '🏅 **Final Standings**',
                            value: resultText || 'No players scored'
                        }
                    ],
                    footer: {
                        text: 'Thanks for playing! Use /trivia to play again.'
                    }
                };
                
                await interaction.followUp({ embeds: [finalEmbed] });
            };
            
            // Start asking questions
            setTimeout(askQuestion, 2000);
            
        } catch (error) {
            console.error('Trivia error:', error);
            await interaction.reply('An error occurred while starting the trivia game.');
        }
    },
};