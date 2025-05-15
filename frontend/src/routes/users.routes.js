const express = require('express');
const auth = require('../middleware/auth');
const User = require('../models/user.model');
const router = express.Router();

// Get team members (for managers)
router.get('/team', auth, async (req, res) => {
  try {
    if (req.user.role !== 'manager') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const teamMembers = await User.find({ managerId: req.user.userId })
      .select('-password')
      .sort('name');

    res.json({
      success: true,
      data: teamMembers
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching team members',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get all managers (for assigning developers to managers)
router.get('/managers', auth, async (req, res) => {
  try {
    const managers = await User.find({ role: 'manager' })
      .select('name email')
      .sort('name');

    res.json({
      success: true,
      data: managers
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching managers',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Update user profile
router.patch('/profile', auth, async (req, res) => {
  try {
    const allowedUpdates = ['name', 'avatar'];
    const updates = Object.keys(req.body)
      .filter(key => allowedUpdates.includes(key))
      .reduce((obj, key) => {
        obj[key] = req.body[key];
        return obj;
      }, {});

    const user = await User.findByIdAndUpdate(
      req.user.userId,
      updates,
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating profile',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Change password
router.post('/change-password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password updated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error changing password',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Reassign developer to new manager (manager only)
router.patch('/reassign/:userId', auth, async (req, res) => {
  try {
    if (req.user.role !== 'manager') {
      return res.status(403).json({
        success: false,
        message: 'Only managers can reassign developers'
      });
    }

    const { newManagerId, team } = req.body;
    const developerId = req.params.userId;

    // Verify developer exists and is currently under this manager
    const developer = await User.findOne({
      _id: developerId,
      managerId: req.user.userId,
      role: 'developer'
    });

    if (!developer) {
      return res.status(404).json({
        success: false,
        message: 'Developer not found or not in your team'
      });
    }

    // Verify new manager exists
    const newManager = await User.findOne({
      _id: newManagerId,
      role: 'manager'
    });

    if (!newManager) {
      return res.status(404).json({
        success: false,
        message: 'New manager not found'
      });
    }

    // Update developer's manager
    developer.managerId = newManagerId;
    developer.team = team;
    await developer.save();

    res.json({
      success: true,
      message: 'Developer reassigned successfully',
      data: developer
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error reassigning developer',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get user streaks and achievements
router.get('/:id/streaks', auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('logStreak achievements');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    res.json({
      success: true,
      data: {
        logStreak: user.logStreak,
        achievements: user.achievements
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching streaks and achievements',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Update user log streak and achievements
router.post('/logs/:id', auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Logic to update streak and achievements
    // For example, increment streak if log is submitted consecutively
    user.logStreak += 1; // Simplified logic
    user.achievements.push('New Achievement'); // Example achievement

    await user.save();

    res.json({
      success: true,
      message: 'Log streak and achievements updated',
      data: {
        logStreak: user.logStreak,
        achievements: user.achievements
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating log streak and achievements',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router; 