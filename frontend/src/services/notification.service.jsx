const nodemailer = require('nodemailer');
const cron = require('node-cron');
const User = require('../models/user.model');
const WorkLog = require('../models/worklog.model');
const Team = require('../models/team.model');

class NotificationService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    // Initialize cron jobs
    this.initializeCronJobs();
  }

  async sendEmail(to, subject, html) {
    try {
      const mailOptions = {
        from: `"DevLog" <${process.env.SMTP_USER}>`,
        to,
        subject,
        html
      };

      await this.transporter.sendMail(mailOptions);
      return true;
    } catch (error) {
      console.error('Email sending failed:', error);
      return false;
    }
  }

  async sendDailyReminder(user) {
    const reminderTemplate = `
      <h2>Daily Log Reminder</h2>
      <p>Hi ${user.name},</p>
      <p>Don't forget to submit your daily work log for today. It's important to keep track of your progress!</p>
      <p>Click <a href="${process.env.FRONTEND_URL}/logs/new">here</a> to submit your log now.</p>
      <p>Best regards,<br>DevLog Team</p>
    `;

    return this.sendEmail(
      user.email,
      'DevLog - Daily Log Reminder',
      reminderTemplate
    );
  }

  async sendWeeklySummary(user) {
    try {
      // Get logs from the past week
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      const logs = await WorkLog.find({
        user: user._id,
        date: { $gte: oneWeekAgo }
      }).sort({ date: -1 });

      // Calculate statistics
      const totalHours = logs.reduce((sum, log) => sum + log.totalTimeSpent.hours, 0);
      const averageMood = logs.length > 0
        ? logs.reduce((sum, log) => sum + log.mood.score, 0) / logs.length
        : 0;
      const completionRate = (logs.length / 7) * 100;

      const summaryTemplate = `
        <h2>Weekly Summary Report</h2>
        <p>Hi ${user.name},</p>
        <p>Here's your productivity summary for the past week:</p>
        <ul>
          <li>Total Hours Logged: ${totalHours}</li>
          <li>Average Mood: ${averageMood.toFixed(1)} / 5</li>
          <li>Log Completion Rate: ${completionRate.toFixed(1)}%</li>
          <li>Total Logs Submitted: ${logs.length}</li>
        </ul>
        <h3>Recent Logs:</h3>
        ${logs.map(log => `
          <div style="margin-bottom: 10px;">
            <strong>${new Date(log.date).toLocaleDateString()}</strong>
            <ul>
              ${log.tasks.map(task => `
                <li>${task.description} (${task.timeSpent.hours}h ${task.timeSpent.minutes}m)</li>
              `).join('')}
            </ul>
          </div>
        `).join('')}
        <p>View your complete logs and statistics on <a href="${process.env.FRONTEND_URL}/dashboard">DevLog Dashboard</a>.</p>
        <p>Keep up the great work!</p>
        <p>Best regards,<br>DevLog Team</p>
      `;

      return this.sendEmail(
        user.email,
        'DevLog - Weekly Summary Report',
        summaryTemplate
      );
    } catch (error) {
      console.error('Error generating weekly summary:', error);
      return false;
    }
  }

  async sendManagerNotification(manager, log) {
    const notificationTemplate = `
      <h2>New Work Log Submitted</h2>
      <p>Hi ${manager.name},</p>
      <p>${log.user.name} has submitted a new work log.</p>
      <h3>Summary:</h3>
      <ul>
        <li>Date: ${new Date(log.date).toLocaleDateString()}</li>
        <li>Total Time: ${log.totalTimeSpent.hours}h ${log.totalTimeSpent.minutes}m</li>
        <li>Mood: ${log.mood.emoji}</li>
        ${log.blockers ? `<li>Blockers: ${log.blockers}</li>` : ''}
      </ul>
      <p>View the complete log <a href="${process.env.FRONTEND_URL}/logs/${log._id}">here</a>.</p>
      <p>Best regards,<br>DevLog Team</p>
    `;

    return this.sendEmail(
      manager.email,
      `DevLog - New Log from ${log.user.name}`,
      notificationTemplate
    );
  }

  initializeCronJobs() {
    // Daily reminder at 10 PM
    cron.schedule('0 22 * * *', async () => {
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Find all developers who haven't submitted a log today
        const users = await User.find({ role: 'developer' });

        for (const user of users) {
          const logExists = await WorkLog.findOne({
            user: user._id,
            date: {
              $gte: today,
              $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
            }
          });

          if (!logExists && user.settings.emailNotifications) {
            await this.sendDailyReminder(user);
          }
        }
      } catch (error) {
        console.error('Daily reminder cron job failed:', error);
      }
    });

    // Weekly summary on Sunday at 9 PM
    cron.schedule('0 21 * * 0', async () => {
      try {
        const users = await User.find({
          'settings.emailNotifications': true
        });

        for (const user of users) {
          await this.sendWeeklySummary(user);
        }
      } catch (error) {
        console.error('Weekly summary cron job failed:', error);
      }
    });
  }
}

module.exports = new NotificationService(); 