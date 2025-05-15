const express = require('express');
const Log = require('../models/Log');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get calendar data
router.get('/data', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const logs = await Log.find({ user: userId }).sort('createdAt');

    const calendarData = logs.map(log => ({
      date: log.createdAt.toISOString().split('T')[0],
      mood: log.mood,
      timeSpent: log.timeSpent
    }));

    // Calculate streaks
    let streak = 0;
    let maxStreak = 0;
    let lastDate = null;

    calendarData.forEach(entry => {
      const currentDate = new Date(entry.date);
      if (lastDate && (currentDate - lastDate) === 86400000) { // 1 day in ms
        streak++;
      } else {
        streak = 1;
      }
      maxStreak = Math.max(maxStreak, streak);
      lastDate = currentDate;
    });

    res.json({ calendarData, maxStreak });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching calendar data', error });
  }
});

module.exports = router; 