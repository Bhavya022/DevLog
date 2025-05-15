const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update last active timestamp
    user.lastActive = new Date();
    await user.save();

    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Invalid authentication token'
    });
  }
};

const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    next();
  };
};

const isManager = (req, res, next) => {
  return requireRole(['manager'])(req, res, next);
};

const isDeveloper = (req, res, next) => {
  return requireRole(['developer'])(req, res, next);
};

const isTeamMember = async (req, res, next) => {
  try {
    const teamId = req.params.teamId || req.body.teamId;
    
    if (!teamId) {
      return res.status(400).json({
        success: false,
        message: 'Team ID is required'
      });
    }

    const Team = require('../models/team.model');
    const team = await Team.findById(teamId);

    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    const isManager = team.manager.equals(req.user._id);
    const isMember = team.members.some(member => member.equals(req.user._id));

    if (!isManager && !isMember) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Not a team member'
      });
    }

    req.team = team;
    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error checking team membership'
    });
  }
};

module.exports = {
  auth,
  requireRole,
  isManager,
  isDeveloper,
  isTeamMember
}; 