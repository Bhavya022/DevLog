const cron = require('node-cron');
const Log = require('../models/Log');
const User = require('../models/User');
const { sendEmail } = require('./notification.service');

const initialize = () => {
  // Daily reminder to developers at 10 PM
  cron.schedule('0 22 * * *', async () => {
    try {
      const developers = await User.find({ role: 'developer' });
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      for (const developer of developers) {
        const logs = await Log.find({ user: developer._id, createdAt: { $gte: today } });
        if (logs.length === 0) {
          sendEmail(developer.email, 'Daily Log Reminder', 'Please submit your daily log.');
        }
      }
    } catch (error) {
      console.error('Error sending daily reminders:', error);
    }
  });

  // Notify managers on new log submission
  Log.watch().on('change', async (change) => {
    if (change.operationType === 'insert') {
      try {
        const log = change.fullDocument;
        const managers = await User.find({ role: 'manager' });
        for (const manager of managers) {
          sendEmail(manager.email, 'New Log Submitted', `A new log has been submitted by ${log.user}.`);
        }
      } catch (error) {
        console.error('Error notifying managers:', error);
      }
    }
  });
};

module.exports = { initialize }; 