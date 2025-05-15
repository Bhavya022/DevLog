const { WebClient } = require('@slack/web-api');
const cron = require('node-cron');
require('dotenv').config();
const axios = require('axios');

const slackToken = process.env.SLACK_BOT_TOKEN;
const slackClient = new WebClient(slackToken);

// Function to send a message to a Slack channel
async function sendMessage(channel, text) {
  try {
    await slackClient.chat.postMessage({
      channel,
      text
    });
  } catch (error) {
    console.error('Error sending message to Slack:', error);
  }
}

// Schedule a 10 PM reminder
cron.schedule('0 22 * * *', async () => {
  const channel = process.env.SLACK_CHANNEL_ID;
  const text = 'Reminder: Please submit your daily logs.';
  await sendMessage(channel, text);
}, {
  timezone: 'America/New_York' // Adjust timezone as needed
});

// Function to handle log submission from Slack
async function handleLogSubmission(userId, taskDescription, timeSpent, mood, blockers) {
  try {
    // Assuming there's an API endpoint to handle log submissions
    const response = await axios.post('/api/logs', {
      userId,
      taskDescription,
      timeSpent,
      mood,
      blockers
    });
    return response.data;
  } catch (error) {
    console.error('Error submitting log from Slack:', error);
    throw error;
  }
}

// Function to send weekly summary to managers
async function sendWeeklySummary(managerId) {
  try {
    // Fetch the weekly summary data
    const response = await axios.get(`/api/reports/weekly?userId=${managerId}`);
    const summary = response.data;

    // Send the summary via Slack DM
    const user = await slackClient.users.lookupByEmail({ email: summary.managerEmail });
    await sendMessage(user.user.id, `Weekly Summary: ${summary.text}`);
  } catch (error) {
    console.error('Error sending weekly summary to manager:', error);
  }
}

module.exports = {
  sendMessage,
  handleLogSubmission,
  sendWeeklySummary
}; 