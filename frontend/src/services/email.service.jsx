const nodemailer = require('nodemailer');
const sgMail = require('@sendgrid/mail');
const moment = require('moment');

// Initialize SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Create email transport
const transport = process.env.SENDGRID_API_KEY
  ? null // Use SendGrid directly
  : nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

// Helper to send email
const sendEmail = async (to, subject, html) => {
  const msg = {
    to,
    from: process.env.EMAIL_FROM,
    subject,
    html
  };

  try {
    if (process.env.SENDGRID_API_KEY) {
      await sgMail.send(msg);
    } else {
      await transport.sendMail(msg);
    }
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

// Send log reminder
const sendLogReminder = async (email, name) => {
  const subject = 'Daily Log Reminder';
  const html = `
    <h2>Hello ${name},</h2>
    <p>This is a friendly reminder to submit your daily log for today.</p>
    <p>Keeping track of your work helps you and your team stay organized and productive.</p>
    <p>Click the button below to submit your log now:</p>
    <a href="${process.env.FRONTEND_URL}/logs/new" style="
      display: inline-block;
      background-color: #4F46E5;
      color: white;
      padding: 12px 24px;
      text-decoration: none;
      border-radius: 6px;
      margin: 16px 0;
    ">Submit Daily Log</a>
    <p>Best regards,<br>DevLog Team</p>
  `;

  await sendEmail(email, subject, html);
};

// Send weekly summary
const sendWeeklySummary = async (email, name, logs, teamStats) => {
  const formatDuration = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const getMoodEmoji = (mood) => {
    const emojis = ['😢', '😕', '😐', '🙂', '😄'];
    return emojis[mood - 1] || '😐';
  };

  const generateLogsSummary = (logs) => {
    return logs.map(log => `
      <div style="margin-bottom: 16px; padding: 16px; background-color: #f9fafb; border-radius: 6px;">
        <div style="font-weight: bold; margin-bottom: 8px;">
          ${moment(log.date).format('dddd, MMMM D')}
          ${getMoodEmoji(log.mood)}
        </div>
        ${log.tasks.map(task => `
          <div style="margin-left: 16px; margin-bottom: 8px;">
            • ${task.description}
            <span style="color: #6B7280; font-size: 0.9em;">
              (${task.timeSpent.hours}h ${task.timeSpent.minutes}m)
            </span>
          </div>
        `).join('')}
        ${log.blockers ? `
          <div style="margin-top: 8px; color: #DC2626;">
            <strong>Blockers:</strong> ${log.blockers}
          </div>
        ` : ''}
      </div>
    `).join('');
  };

  const generateTeamStats = (stats) => {
    if (!stats) return '';

    return `
      <div style="margin: 24px 0; padding: 16px; background-color: #f0f9ff; border-radius: 6px;">
        <h3 style="margin-top: 0;">Team Statistics</h3>
        <ul style="list-style: none; padding: 0;">
          <li>Total Logs: ${stats.totalLogs}</li>
          <li>Average Mood: ${getMoodEmoji(Math.round(stats.averageMood))} (${stats.averageMood.toFixed(1)})</li>
          <li>Total Time Logged: ${formatDuration(stats.totalTimeSpent)}</li>
        </ul>
      </div>
    `;
  };

  const subject = 'Your Weekly DevLog Summary';
  const html = `
    <h2>Hello ${name},</h2>
    <p>Here's your weekly summary from DevLog:</p>

    ${teamStats ? generateTeamStats(teamStats) : ''}

    <h3>This Week's Logs:</h3>
    ${generateLogsSummary(logs)}

    <p style="margin-top: 24px;">
      <a href="${process.env.FRONTEND_URL}/dashboard" style="
        display: inline-block;
        background-color: #4F46E5;
        color: white;
        padding: 12px 24px;
        text-decoration: none;
        border-radius: 6px;
      ">View Full Dashboard</a>
    </p>

    <p style="margin-top: 24px; color: #6B7280; font-size: 0.9em;">
      You're receiving this email because you have email notifications enabled in your DevLog preferences.
      <br>
      To update your preferences, visit your <a href="${process.env.FRONTEND_URL}/settings">settings page</a>.
    </p>
  `;

  await sendEmail(email, subject, html);
};

// Send feedback notification
const sendFeedbackNotification = async (email, name, managerName, logDate) => {
  const subject = 'New Feedback on Your Log';
  const html = `
    <h2>Hello ${name},</h2>
    <p>${managerName} has provided feedback on your log from ${moment(logDate).format('MMMM D, YYYY')}.</p>
    <p>Click below to view the feedback:</p>
    <a href="${process.env.FRONTEND_URL}/logs/${logDate}" style="
      display: inline-block;
      background-color: #4F46E5;
      color: white;
      padding: 12px 24px;
      text-decoration: none;
      border-radius: 6px;
      margin: 16px 0;
    ">View Feedback</a>
    <p>Best regards,<br>DevLog Team</p>
  `;

  await sendEmail(email, subject, html);
};

module.exports = {
  sendLogReminder,
  sendWeeklySummary,
  sendFeedbackNotification
}; 