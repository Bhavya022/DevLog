const express = require('express');
const PDFDocument = require('pdfkit');
const { Parser } = require('json2csv');
const Log = require('../models/Log');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Generate weekly report
router.get('/weekly', authenticateToken, async (req, res) => {
  try {
    const { format } = req.query;
    const userId = req.user.id;
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const logs = await Log.find({ user: userId, createdAt: { $gte: oneWeekAgo } });

    if (format === 'pdf') {
      const doc = new PDFDocument();
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=weekly_report.pdf');

      doc.pipe(res);
      doc.fontSize(16).text('Weekly Productivity Summary', { align: 'center' });
      doc.moveDown();

      logs.forEach(log => {
        doc.fontSize(12).text(`Task: ${log.taskDescription}`);
        doc.text(`Time Spent: ${log.timeSpent} minutes`);
        doc.text(`Mood: ${log.mood}`);
        doc.text(`Blockers: ${log.blockers || 'None'}`);
        doc.moveDown();
      });

      doc.end();
    } else if (format === 'csv') {
      const fields = ['taskDescription', 'timeSpent', 'mood', 'blockers'];
      const parser = new Parser({ fields });
      const csv = parser.parse(logs);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=weekly_report.csv');
      res.send(csv);
    } else {
      res.status(400).json({ message: 'Invalid format' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error generating report', error });
  }
});

module.exports = router; 