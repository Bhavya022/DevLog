# DevLog Application

DevLog is a full-stack web application designed to enhance developer productivity and streamline daily logging activities. Below is a comprehensive list of features implemented in the application:

## Features

### Authentication & Authorization
- **Secure Login:** Users can securely log in using JWT-based authentication.
- **Role-Based Access Control:** Different access levels for Developers and Managers.
- **Session Management:** Tokens are stored in localStorage for session handling.

### Developer Dashboard
- **Daily Work Logs:** Developers can submit daily work logs and view/edit their submissions.
- **Productivity Heatmap:** Visual representation of productivity over time.

### Manager Dashboard
- **View Developer Logs:** Managers can view logs submitted by developers.
- **Feedback System:** Managers can add feedback and mark logs as reviewed.
- **Team-Level Stats:** Insights into team performance, including top blockers and task tags.

### Gamification
- **Log Streak Badges:** Achievements like "7-day streak" and "No blocker week".
- **Visual Progress Dashboard:** Displays progress and achievements.

### Notification System
- **Daily Reminders:** Automated reminders for developers to submit logs.
- **Manager Notifications:** Alerts for new log submissions.

### Export & Reports
- **Weekly Summaries:** Generate and download productivity summaries in PDF or CSV format.

### Calendar & Heatmap View
- **Mood Entries:** Calendar view with mood entries and daily log streaks.

### AI Log Suggestion
- **AI-Generated Summaries:** Use AI to generate polished summaries from raw log text.

### Voice-to-Text Log Input
- **Voice Dictation:** Use Web Speech API for voice dictation of logs.

### Slack/Discord Integration
- **Reminders via Bot:** 10 PM reminders for log submissions.
- **Log Submission from Slack:** Submit logs directly from Slack.
- **Weekly Summary via Slack DM:** Managers receive weekly summaries via Slack.

### Email Digest
- **Weekly Email Summary:** Every Sunday night, users receive an email with a mood chart, productivity score, weekly logs, and an AI-generated summary.

### UI Enhancements
- **Dark Mode Toggle:** Users can switch between light and dark modes.
- **Smooth Animations:** Enhanced UI with Framer Motion and CSS transitions.

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/devlog.git
   ```

2. Navigate to the project directory:
   ```bash
   cd devlog
   ```

3. Install server dependencies:
   ```bash
   npm install
   ```

4. Install client dependencies:
   ```bash
   cd frontend
   npm install
   ```

5. Set up environment variables in a `.env` file:
   ```
   MONGODB_URI=your_mongodb_uri
   JWT_SECRET=your_jwt_secret
   SENDGRID_API_KEY=your_sendgrid_api_key
   SLACK_BOT_TOKEN=your_slack_bot_token
   SLACK_CHANNEL_ID=your_slack_channel_id
   FRONTEND_URL=http://localhost:3000
   PORT=5000
   ```

6. Start the development server:
   ```bash
   npm run dev
   ```

## Contributing

Contributions are welcome! Please fork the repository and submit a pull request.

## License

This project is licensed under the MIT License.