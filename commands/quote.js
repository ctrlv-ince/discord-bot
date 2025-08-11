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
            const quotes = response.data;

            if (!quotes || quotes.length === 0) {
                return interaction.reply('No quotes found matching your criteria.');
            }

            // Format quotes for display
            const quoteList = quotes.map(q => 
                `"${q.content}"\n- ${q.author}\n` + 
                (q.tags ? `Tags: ${q.tags.join(', ')}\n` : '')
            ).join('\n');

            await interaction.reply(`Here are your quotes:\n\n${quoteList}`);

        } catch (error) {
            console.error('Quote error:', error);
            interaction.reply('Failed to fetch quotes. Please try again later.');
        }
    },
};