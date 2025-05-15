const cron = require('node-cron');
const User = require('../models/user.model');
const Log = require('../models/log.model');
const socketService = require('./socket.service');
const emailService = require('./email.service');

// Schedule daily log reminders at 10 PM
const scheduleDailyReminders = () => {
  // Run at 22:00 (10 PM) every day
  cron.schedule('0 22 * * *', async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Find all developers
      const developers = await User.find({ role: 'developer' });

      for (const developer of developers) {
        // Check if log exists for today
        const logExists = await Log.findOne({
          userId: developer._id,
          date: {
            $gte: today,
            $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
          }
        });

        if (!logExists) {
          // Send socket notification
          socketService.sendLogReminder(developer._id);

          // Send email reminder if enabled
          if (developer.preferences.emailNotifications) {
            emailService.sendLogReminder(developer.email, developer.name);
          }
        }
      }
    } catch (error) {
      console.error('Error sending daily reminders:', error);
    }
  }, {
    timezone: 'UTC'
  });
};

// Schedule weekly summary emails (Sunday at 8 PM)
const scheduleWeeklySummaries = () => {
  // Run at 20:00 (8 PM) every Sunday
  cron.schedule('0 20 * * 0', async () => {
    try {
      // Get all users
      const users = await User.find({
        'preferences.emailNotifications': true
      });

      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      for (const user of users) {
        let logs;
        let teamStats = null;

        if (user.role === 'developer') {
          // Get developer's logs
          logs = await Log.find({
            userId: user._id,
            date: { $gte: oneWeekAgo }
          }).sort({ date: -1 });

        } else if (user.role === 'manager') {
          // Get team's logs
          const teamMembers = await User.find({ managerId: user._id });
          const teamMemberIds = teamMembers.map(member => member._id);

          logs = await Log.find({
            userId: { $in: teamMemberIds },
            date: { $gte: oneWeekAgo }
          }).populate('userId', 'name').sort({ date: -1 });

          // Calculate team stats
          teamStats = await Log.aggregate([
            {
              $match: {
                userId: { $in: teamMemberIds },
                date: { $gte: oneWeekAgo }
              }
            },
            {
              $group: {
                _id: null,
                totalLogs: { $sum: 1 },
                averageMood: { $avg: '$mood' },
                totalTimeSpent: { $sum: '$totalTimeSpent' }
              }
            }
          ]);
        }

        // Send weekly summary email
        await emailService.sendWeeklySummary(
          user.email,
          user.name,
          logs,
          teamStats?.[0]
        );
      }
    } catch (error) {
      console.error('Error sending weekly summaries:', error);
    }
  }, {
    timezone: 'UTC'
  });
};

// Initialize all schedulers
const initialize = () => {
  scheduleDailyReminders();
  scheduleWeeklySummaries();
  console.log('Scheduler service initialized');
};

module.exports = {
  initialize
}; 