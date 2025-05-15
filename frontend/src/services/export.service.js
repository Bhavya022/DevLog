const PDFDocument = require('pdfkit');
const { Parser } = require('json2csv');
const WorkLog = require('../models/worklog.model');
const AIService = require('./ai.service');

class ExportService {
  async generatePDF(logs, user) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument();
        const chunks = [];

        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));

        // Header
        doc.fontSize(20).text('DevLog - Work Log Summary', { align: 'center' });
        doc.moveDown();
        doc.fontSize(14).text(`Report for: ${user.name}`, { align: 'left' });
        doc.fontSize(12).text(`Generated on: ${new Date().toLocaleDateString()}`);
        doc.moveDown();

        // Statistics
        const stats = this.calculateStats(logs);
        doc.fontSize(16).text('Summary Statistics');
        doc.fontSize(12)
          .text(`Total Logs: ${stats.totalLogs}`)
          .text(`Average Mood: ${stats.averageMood.toFixed(1)}/5`)
          .text(`Total Hours: ${stats.totalHours}`)
          .text(`Completion Rate: ${stats.completionRate}%`)
          .text(`Days with Blockers: ${stats.blockersCount}`);
        doc.moveDown();

        // Detailed Logs
        doc.fontSize(16).text('Detailed Logs');
        logs.forEach(log => {
          doc.moveDown()
            .fontSize(14)
            .text(new Date(log.date).toLocaleDateString(), { underline: true });
          
          doc.fontSize(12);
          log.tasks.forEach(task => {
            doc.text(`• ${task.description} (${task.timeSpent.hours}h ${task.timeSpent.minutes}m)`);
          });

          doc.text(`Mood: ${log.mood.emoji} (${log.mood.score}/5)`);
          
          if (log.blockers) {
            doc.text(`Blockers: ${log.blockers}`);
          }

          if (log.aiSummary) {
            doc.moveDown()
              .fontSize(10)
              .text('AI Summary:', { italic: true })
              .text(log.aiSummary, { italic: true });
          }
        });

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  async generateCSV(logs) {
    try {
      const fields = [
        'date',
        'totalTimeSpent.hours',
        'totalTimeSpent.minutes',
        'mood.score',
        'mood.emoji',
        'blockers',
        'status',
        'streak'
      ];

      const json2csvParser = new Parser({ fields });
      
      const data = logs.map(log => ({
        date: new Date(log.date).toISOString().split('T')[0],
        'totalTimeSpent.hours': log.totalTimeSpent.hours,
        'totalTimeSpent.minutes': log.totalTimeSpent.minutes,
        'mood.score': log.mood.score,
        'mood.emoji': log.mood.emoji,
        blockers: log.blockers || '',
        status: log.status,
        streak: log.streak
      }));

      return json2csvParser.parse(data);
    } catch (error) {
      throw error;
    }
  }

  calculateStats(logs) {
    const stats = {
      totalLogs: logs.length,
      averageMood: 0,
      totalHours: 0,
      completionRate: 0,
      blockersCount: 0
    };

    if (logs.length > 0) {
      stats.averageMood = logs.reduce((sum, log) => sum + log.mood.score, 0) / logs.length;
      stats.totalHours = logs.reduce((sum, log) => sum + log.totalTimeSpent.hours, 0);
      stats.blockersCount = logs.filter(log => log.blockers).length;
      
      // Calculate completion rate based on consecutive days
      const dateRange = Math.ceil(
        (new Date(logs[0].date) - new Date(logs[logs.length - 1].date)) / (1000 * 60 * 60 * 24)
      ) + 1;
      stats.completionRate = (logs.length / dateRange) * 100;
    }

    return stats;
  }
}

module.exports = new ExportService(); 