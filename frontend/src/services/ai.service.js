const { Configuration, OpenAIApi } = require('openai');

class AIService {
  constructor() {
    const configuration = new Configuration({
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.openai = new OpenAIApi(configuration);
  }

  async generateLogSummary(tasks, mood, blockers) {
    try {
      const taskDescriptions = tasks.map(task => 
        `- ${task.description} (${task.timeSpent.hours}h ${task.timeSpent.minutes}m)`
      ).join('\n');

      const prompt = `Summarize the following developer's daily work log in a professional and concise manner:

Tasks:
${taskDescriptions}

Mood: ${mood.emoji} (${mood.score}/5)
${blockers ? `Blockers: ${blockers}` : 'No blockers reported'}

Please provide a brief, well-structured summary that highlights:
1. Key accomplishments
2. Time allocation
3. Any challenges or blockers
4. Overall productivity assessment

Keep the summary professional and actionable.`;

      const response = await this.openai.createCompletion({
        model: "gpt-3.5-turbo-instruct",
        prompt,
        max_tokens: 250,
        temperature: 0.7,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0
      });

      return response.data.choices[0].text.trim();
    } catch (error) {
      console.error('Error generating AI summary:', error);
      return null;
    }
  }

  async suggestImprovements(logs) {
    try {
      const logSummaries = logs.map(log => ({
        date: new Date(log.date).toISOString().split('T')[0],
        totalTime: `${log.totalTimeSpent.hours}h ${log.totalTimeSpent.minutes}m`,
        mood: log.mood.score,
        hasBlockers: !!log.blockers,
        taskCount: log.tasks.length
      }));

      const prompt = `Analyze the following developer work logs and suggest improvements for productivity and work habits:

${JSON.stringify(logSummaries, null, 2)}

Please provide actionable suggestions regarding:
1. Time management
2. Work patterns
3. Potential areas of improvement
4. Stress management (based on mood patterns)

Keep suggestions constructive and specific.`;

      const response = await this.openai.createCompletion({
        model: "gpt-3.5-turbo-instruct",
        prompt,
        max_tokens: 300,
        temperature: 0.7,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0
      });

      return response.data.choices[0].text.trim();
    } catch (error) {
      console.error('Error generating improvement suggestions:', error);
      return null;
    }
  }

  async analyzeTeamTrends(teamLogs) {
    try {
      const teamSummary = {
        totalLogs: teamLogs.length,
        averageMood: teamLogs.reduce((sum, log) => sum + log.mood.score, 0) / teamLogs.length,
        commonBlockers: teamLogs.filter(log => log.blockers).length,
        totalHours: teamLogs.reduce((sum, log) => sum + log.totalTimeSpent.hours, 0)
      };

      const prompt = `Analyze the following team's work log data and provide insights:

${JSON.stringify(teamSummary, null, 2)}

Please provide insights on:
1. Team productivity trends
2. Mood patterns and potential burnout risks
3. Common challenges and blockers
4. Recommendations for team improvement

Focus on actionable insights that would be valuable for a team manager.`;

      const response = await this.openai.createCompletion({
        model: "gpt-3.5-turbo-instruct",
        prompt,
        max_tokens: 350,
        temperature: 0.7,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0
      });

      return response.data.choices[0].text.trim();
    } catch (error) {
      console.error('Error analyzing team trends:', error);
      return null;
    }
  }

  async generateWeeklySummary(logs) {
    try {
      const weekSummary = {
        totalDays: logs.length,
        averageMood: logs.reduce((sum, log) => sum + log.mood.score, 0) / logs.length,
        totalHours: logs.reduce((sum, log) => sum + log.totalTimeSpent.hours, 0),
        completedTasks: logs.reduce((sum, log) => sum + log.tasks.length, 0),
        blockerDays: logs.filter(log => log.blockers).length
      };

      const prompt = `Create a professional weekly summary based on the following work log data:

${JSON.stringify(weekSummary, null, 2)}

Please provide a comprehensive yet concise summary that includes:
1. Overall productivity assessment
2. Key achievements and milestones
3. Challenges faced and overcome
4. Mood and work-life balance analysis
5. Suggestions for the coming week

Format the summary in a professional tone suitable for both self-reflection and manager review.`;

      const response = await this.openai.createCompletion({
        model: "gpt-3.5-turbo-instruct",
        prompt,
        max_tokens: 400,
        temperature: 0.7,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0
      });

      return response.data.choices[0].text.trim();
    } catch (error) {
      console.error('Error generating weekly summary:', error);
      return null;
    }
  }
}

module.exports = new AIService(); 