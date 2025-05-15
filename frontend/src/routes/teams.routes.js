const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { auth, isManager, isTeamMember } = require('../middleware/auth.middleware');
const Team = require('../models/team.model');
const User = require('../models/user.model');
const WorkLog = require('../models/worklog.model');

// Validation middleware
const teamValidation = [
  body('name').trim().notEmpty(),
  body('members').isArray(),
  body('description').optional().trim()
];

// Create team
router.post('/', auth, isManager, teamValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { name, members, description, department } = req.body;

    // Validate members exist and are developers
    if (members && members.length > 0) {
      const users = await User.find({ _id: { $in: members } });
      const invalidMembers = members.filter(id => 
        !users.find(user => user._id.toString() === id && user.role === 'developer')
      );

      if (invalidMembers.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Some members are invalid or not developers'
        });
      }
    }

    const team = new Team({
      name,
      manager: req.user._id,
      members: members || [],
      description,
      department
    });

    await team.save();

    // Update users' team reference
    if (members && members.length > 0) {
      await User.updateMany(
        { _id: { $in: members } },
        { $set: { team: team._id } }
      );
    }

    // Update manager's managedTeams
    await User.findByIdAndUpdate(
      req.user._id,
      { $push: { managedTeams: team._id } }
    );

    res.status(201).json({
      success: true,
      data: team
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating team',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get all teams (for manager)
router.get('/', auth, isManager, async (req, res) => {
  try {
    const teams = await Team.find({ manager: req.user._id })
      .populate('members', 'name email')
      .populate('manager', 'name email');

    res.json({
      success: true,
      data: teams
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching teams',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get single team
router.get('/:id', auth, isTeamMember, async (req, res) => {
  try {
    const team = await Team.findById(req.params.id)
      .populate('members', 'name email')
      .populate('manager', 'name email');

    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    res.json({
      success: true,
      data: team
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching team',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Update team
router.patch('/:id', auth, isManager, async (req, res) => {
  try {
    const team = await Team.findOne({
      _id: req.params.id,
      manager: req.user._id
    });

    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    const updates = Object.keys(req.body);
    const allowedUpdates = ['name', 'members', 'description', 'department', 'settings'];
    const isValidOperation = updates.every(update => allowedUpdates.includes(update));

    if (!isValidOperation) {
      return res.status(400).json({
        success: false,
        message: 'Invalid updates'
      });
    }

    // If updating members, validate them
    if (req.body.members) {
      const users = await User.find({ _id: { $in: req.body.members } });
      const invalidMembers = req.body.members.filter(id => 
        !users.find(user => user._id.toString() === id && user.role === 'developer')
      );

      if (invalidMembers.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Some members are invalid or not developers'
        });
      }

      // Remove team reference from old members
      await User.updateMany(
        { _id: { $in: team.members } },
        { $unset: { team: "" } }
      );

      // Add team reference to new members
      await User.updateMany(
        { _id: { $in: req.body.members } },
        { $set: { team: team._id } }
      );
    }

    updates.forEach(update => {
      team[update] = req.body[update];
    });

    await team.save();

    res.json({
      success: true,
      data: team
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating team',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Delete team
router.delete('/:id', auth, isManager, async (req, res) => {
  try {
    const team = await Team.findOne({
      _id: req.params.id,
      manager: req.user._id
    });

    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    // Remove team reference from members
    await User.updateMany(
      { _id: { $in: team.members } },
      { $unset: { team: "" } }
    );

    // Remove team from manager's managedTeams
    await User.findByIdAndUpdate(
      req.user._id,
      { $pull: { managedTeams: team._id } }
    );

    await team.remove();

    res.json({
      success: true,
      message: 'Team deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting team',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Extend team statistics to include top blockers and task tags
router.get('/:id/stats', auth, isTeamMember, async (req, res) => {
  try {
    const team = await Team.findById(req.params.id).populate('members', 'name');
    const logs = await WorkLog.find({ user: { $in: team.members } });

    // Calculate top blockers
    const blockerCounts = {};
    logs.forEach(log => {
      if (log.blockers) {
        blockerCounts[log.blockers] = (blockerCounts[log.blockers] || 0) + 1;
      }
    });
    const topBlockers = Object.entries(blockerCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);

    // Calculate most logged task tags
    const tagCounts = {};
    logs.forEach(log => {
      log.tasks.forEach(task => {
        task.tags.forEach(tag => {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
      });
    });
    const topTags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);

    const stats = await team.calculateStats();

    res.json({
      success: true,
      data: {
        ...stats,
        topBlockers,
        topTags
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching team statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// New endpoint for time distribution by task type
router.get('/:id/time-distribution', auth, isTeamMember, async (req, res) => {
  try {
    const team = await Team.findById(req.params.id).populate('members', 'name');
    const logs = await WorkLog.find({ user: { $in: team.members } });

    const timeDistribution = {};
    logs.forEach(log => {
      log.tasks.forEach(task => {
        const taskType = task.status;
        const timeSpent = task.timeSpent.hours * 60 + task.timeSpent.minutes;
        timeDistribution[taskType] = (timeDistribution[taskType] || 0) + timeSpent;
      });
    });

    res.json({
      success: true,
      data: timeDistribution
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching time distribution',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router; 