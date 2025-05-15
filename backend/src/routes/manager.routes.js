const express = require('express');
const Log = require('../models/Log');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// Get logs for a manager's team
router.get('/', authenticateToken, authorizeRoles('manager'), async (req, res) => {
  try {
    const { date, developerName, taskTag, blockers } = req.query;
    const query = { reviewed: false };

    if (date) query.createdAt = { $gte: new Date(date) };
    if (developerName) query['user.name'] = developerName;
    if (taskTag) query.taskDescription = new RegExp(taskTag, 'i');
    if (blockers) query.blockers = new RegExp(blockers, 'i');

    const logs = await Log.find(query).populate('user', 'name');
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving logs', error });
  }
});

// Add feedback to a log
router.post('/:id/feedback', authenticateToken, authorizeRoles('manager'), async (req, res) => {
  try {
    const { id } = req.params;
    const { feedback } = req.body;
    const log = await Log.findByIdAndUpdate(id, { feedback }, { new: true });
    if (!log) return res.status(404).json({ message: 'Log not found' });
    res.json(log);
  } catch (error) {
    res.status(500).json({ message: 'Error adding feedback', error });
  }
});

// Mark a log as reviewed
router.post('/:id/review', authenticateToken, authorizeRoles('manager'), async (req, res) => {
  try {
    const { id } = req.params;
    const log = await Log.findByIdAndUpdate(id, { reviewed: true }, { new: true });
    if (!log) return res.status(404).json({ message: 'Log not found' });
    res.json(log);
  } catch (error) {
    res.status(500).json({ message: 'Error marking log as reviewed', error });
  }
});

module.exports = router; 