const express = require('express');
const { Configuration, OpenAIApi, default: OpenAI } = require('openai');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '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',
});


// AI Log Suggestion
router.post('/suggest-log', authenticateToken, async (req, res) => {
  try {
    const { rawText } = req.body;
    const response = await openai.createCompletion({
      model: 'text-davinci-003',
      prompt: `Polish the following log entry: ${rawText}`,
      max_tokens: 150,
    });

    const polishedSummary = response.data.choices[0].text.trim();
    res.json({ polishedSummary });
  } catch (error) {
    res.status(500).json({ message: 'Error generating log suggestion', error });
  }
});

module.exports = router; 