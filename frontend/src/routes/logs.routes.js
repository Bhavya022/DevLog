const express = require('express');
const router = express.Router();
const { body, query, validationResult } = require('express-validator');
const { auth, isManager } = require('../middleware/auth.middleware');
const WorkLog = require('../models/worklog.model');
const User = require('../models/user.model');
const Team = require('../models/team.model');

// Validation middleware
const logValidation = [
  body('tasks').isArray().notEmpty(),
  body('tasks.*.description').trim().notEmpty(),
  body('tasks.*.timeSpent.hours').isInt({ min: 0 }),
  body('tasks.*.timeSpent.minutes').isInt({ min: 0, max: 59 }),
  body('mood.score').isInt({ min: 1, max: 5 }),
  body('mood.emoji').isIn(['😢', '😕', '😐', '🙂', '😄'])
];

// Create work log
router.post('/', auth, logValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    // Check if log already exists for today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const existingLog = await WorkLog.findOne({
      user: req.user._id,
      date: {
        $gte: today,
        $lt: tomorrow
      }
    });

    if (existingLog) {
      return res.status(400).json({
        success: false,
        message: 'Log already exists for today'
      });
    }

    const workLog = new WorkLog({
      ...req.body,
      user: req.user._id,
      date: new Date()
    });

    await workLog.save();

    // Update user's streak
    const yesterdayLog = await WorkLog.findOne({
      user: req.user._id,
      date: {
        $gte: new Date(today.setDate(today.getDate() - 1)),
        $lt: new Date(today)
      }
    });

    if (yesterdayLog) {
      workLog.streak = yesterdayLog.streak + 1;
      await workLog.save();
    }

    res.status(201).json({
      success: true,
      data: workLog
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating work log',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get logs with filtering
router.get('/', auth, async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      userId,
      status,
      hasBlockers,
      page = 1,
      limit = 10
    } = req.query;

    // Build query
    const query = {};

    // Date range
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    // User access control
    if (req.user.role === 'manager') {
      const teams = await Team.find({ manager: req.user._id });
      const teamMembers = teams.reduce((acc, team) => [...acc, ...team.members], []);
      
      if (userId) {
        if (!teamMembers.includes(userId)) {
          return res.status(403).json({
            success: false,
            message: 'Access denied: User not in your team'
          });
        }
        query.user = userId;
      } else {
        query.user = { $in: teamMembers };
      }
    } else {
      query.user = req.user._id;
    }

    // Status filter
    if (status) query.status = status;

    // Blockers filter
    if (hasBlockers === 'true') query.blockers = { $exists: true, $ne: '' };

    // Pagination
    const skip = (page - 1) * limit;

    const logs = await WorkLog.find(query)
      .sort({ date: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('user', 'name email');

    const total = await WorkLog.countDocuments(query);

    res.json({
      success: true,
      data: {
        logs,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching work logs',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get single log
router.get('/:id', auth, async (req, res) => {
  try {
    const workLog = await WorkLog.findById(req.params.id)
      .populate('user', 'name email')
      .populate('reviewedBy', 'name email');

    if (!workLog) {
      return res.status(404).json({
        success: false,
        message: 'Work log not found'
      });
    }

    // Access control
    if (req.user.role === 'developer' && !workLog.user.equals(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: workLog
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching work log',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Update log
router.patch('/:id', auth, async (req, res) => {
  try {
    const workLog = await WorkLog.findById(req.params.id);

    if (!workLog) {
      return res.status(404).json({
        success: false,
        message: 'Work log not found'
      });
    }

    // Access control
    if (!workLog.user.equals(req.user._id) && req.user.role !== 'manager') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Only allow updating certain fields based on role
    const updates = Object.keys(req.body);
    const allowedUpdates = req.user.role === 'manager'
      ? ['status', 'feedback', 'reviewedBy', 'reviewedAt']
      : ['tasks', 'mood', 'blockers', 'summary'];

    const isValidOperation = updates.every(update => allowedUpdates.includes(update));

    if (!isValidOperation) {
      return res.status(400).json({
        success: false,
        message: 'Invalid updates'
      });
    }

    updates.forEach(update => {
      workLog[update] = req.body[update];
    });

    if (req.user.role === 'manager') {
      workLog.reviewedBy = req.user._id;
      workLog.reviewedAt = new Date();
    }

    await workLog.save();

    res.json({
      success: true,
      data: workLog
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating work log',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Add feedback to log
router.post('/:id/feedback', auth, isManager, async (req, res) => {
  try {
    const { comment } = req.body;

    if (!comment || !comment.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Feedback comment is required'
      });
    }

    const workLog = await WorkLog.findById(req.params.id);

    if (!workLog) {
      return res.status(404).json({
        success: false,
        message: 'Work log not found'
      });
    }

    workLog.feedback.push({
      user: req.user._id,
      comment: comment.trim()
    });

    await workLog.save();

    res.json({
      success: true,
      data: workLog
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error adding feedback',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get user statistics
router.get('/stats/me', auth, async (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const logs = await WorkLog.find({
      user: req.user._id,
      date: { $gte: thirtyDaysAgo }
    });

    // Calculate statistics
    const stats = {
      totalLogs: logs.length,
      averageMood: 0,
      totalHours: 0,
      totalMinutes: 0,
      streak: 0,
      mostCommonTags: {},
      blockersCount: 0
    };

    if (logs.length > 0) {
      // Calculate averages and totals
      stats.averageMood = logs.reduce((sum, log) => sum + log.mood.score, 0) / logs.length;
      
      logs.forEach(log => {
        stats.totalHours += log.totalTimeSpent.hours;
        stats.totalMinutes += log.totalTimeSpent.minutes;
        stats.blockersCount += log.blockers ? 1 : 0;

        // Count tags
        log.tasks.forEach(task => {
          task.tags.forEach(tag => {
            stats.mostCommonTags[tag] = (stats.mostCommonTags[tag] || 0) + 1;
          });
        });
      });

      // Convert excess minutes to hours
      stats.totalHours += Math.floor(stats.totalMinutes / 60);
      stats.totalMinutes = stats.totalMinutes % 60;

      // Get current streak
      stats.streak = logs[0].streak;
    }

    // Convert tags object to sorted array
    stats.mostCommonTags = Object.entries(stats.mostCommonTags)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([tag, count]) => ({ tag, count }));

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Add feedback to a specific task in a log
router.post('/:logId/tasks/:taskId/feedback', auth, isManager, async (req, res) => {
  try {
    const { comment } = req.body;

    if (!comment || !comment.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Feedback comment is required'
      });
    }

    const workLog = await WorkLog.findById(req.params.logId);

    if (!workLog) {
      return res.status(404).json({
        success: false,
        message: 'Work log not found'
      });
    }

    const task = workLog.tasks.id(req.params.taskId);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    task.feedback.push({
      user: req.user._id,
      comment: comment.trim()
    });

    await workLog.save();

    res.json({
      success: true,
      data: workLog
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error adding feedback',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Update task status
router.patch('/:logId/tasks/:taskId/status', auth, isManager, async (req, res) => {
  try {
    const { status } = req.body;

    if (!['Needs Clarification', 'Approved', 'Pending'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    const workLog = await WorkLog.findById(req.params.logId);

    if (!workLog) {
      return res.status(404).json({
        success: false,
        message: 'Work log not found'
      });
    }

    const task = workLog.tasks.id(req.params.taskId);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    task.status = status;

    await workLog.save();

    res.json({
      success: true,
      data: workLog
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating task status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router; 