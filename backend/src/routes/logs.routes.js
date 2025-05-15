const express = require('express');
const Log = require('../models/Log');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// Create a new log
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { taskDescription, timeSpent, mood, blockers } = req.body;
    const log = new Log({
      user: req.user.id,
      taskDescription,
      timeSpent,
      mood,
      blockers
    });
    await log.save();
    res.status(201).json(log);
  } catch (error) {
    res.status(500).json({ message: 'Error creating log', error });
  }
});

// Get all logs for the authenticated user
router.get('/', authenticateToken, authorizeRoles('manager'), async (req, res) => {
  try {
    const logs = await Log.find({ user: req.user.id });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving logs', error });
  }
});

// Update a log
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { taskDescription, timeSpent, mood, blockers } = req.body;
    const log = await Log.findOneAndUpdate(
      { _id: id, user: req.user.id },
      { taskDescription, timeSpent, mood, blockers, updatedAt: Date.now() },
      { new: true }
    );
    if (!log) return res.status(404).json({ message: 'Log not found' });
    res.json(log);
  } catch (error) {
    res.status(500).json({ message: 'Error updating log', error });
  }
});

module.exports = router; 