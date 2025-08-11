const { SlashCommandBuilder } = require('discord.js');
const axios = require('axios');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('quote')
        .setDescription('Get random inspirational quotes')
        .addIntegerOption(option =>
            option.setName('count')
                .setDescription('Number of quotes (1-5)')
                .setMinValue(1)
                .setMaxValue(5))
        .addStringOption(option =>
            option.setName('tags')
                .setDescription('Filter by tags (comma or pipe separated)'))
        .addIntegerOption(option =>
            option.setName('min_length')
                .setDescription('Minimum quote length in characters'))
        .addIntegerOption(option =>
            option.setName('max_length')
                .setDescription('Maximum quote length in characters')),
    async execute(interaction) {
        // Acknowledge the interaction immediately to avoid timeout
        await interaction.deferReply();

        try {
            // Get command options
            const count = interaction.options.getInteger('count') || 1;
            const tags = interaction.options.getString('tags');
            const minLength = interaction.options.getInteger('min_length');
            const maxLength = interaction.options.getInteger('max_length');

            // Build API URL with parameters
            let url = 'https://api.quotable.io/quotes/random?';
            const params = new URLSearchParams();
            
            if (count > 1) params.append('limit', count);
            if (tags) params.append('tags', tags);
            if (minLength) params.append('minLength', minLength);
            if (maxLength) params.append('maxLength', maxLength);
            
            url += params.toString();

            // Fetch quotes
            const response = await axios.get(url);
            let quotes = response.data;

            // Handle single quote response (API returns object for single quote, array for multiple)
            if (!Array.isArray(quotes)) {
                quotes = [quotes];
            }

            if (!quotes || quotes.length === 0) {
                return interaction.editReply('No quotes found matching your criteria. Try different tags or remove filters.');
            }

            // Format quotes for display with better formatting
            const quoteList = quotes.map((q, index) => {
                let quoteText = `**${index + 1}.** "${q.content}"\n`;
                quoteText += `   — *${q.author}*\n`;
                if (q.tags && q.tags.length > 0) {
                    quoteText += `   🏷️ Tags: ${q.tags.join(', ')}\n`;
                }
                if (q.length) {
                    quoteText += `   📏 Length: ${q.length} characters\n`;
                }
                return quoteText;
            }).join('\n');

            // Create embed for better display
            const embed = {
                color: 0x0099ff,
                title: count === 1 ? '💭 Random Quote' : '💭 Random Quotes',
                description: quoteList,
                footer: {
                    text: 'Provided by Quotable.io'
                },
                timestamp: new Date()
            };

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Quote error:', error);
            
            // Provide more specific error messages
            let errorMessage = 'Failed to fetch quotes. Please try again later.';
            
            if (error.response) {
                // API responded with error status
                if (error.response.status === 404) {
                    errorMessage = 'No quotes found matching your criteria. Try different tags or remove filters.';
                } else if (error.response.status === 429) {
                    errorMessage = 'Too many requests! Please wait a moment and try again.';
                } else if (error.response.status >= 500) {
                    errorMessage = 'The quote service is currently unavailable. Please try again later.';
                }
            } else if (error.code === 'ECONNABORTED') {
                errorMessage = 'Request timed out. Please try again.';
            } else if (error.code === 'ENOTFOUND') {
                errorMessage = 'Unable to connect to the quote service. Please check your internet connection.';
            }

            await interaction.editReply(errorMessage);
        }
    },
};