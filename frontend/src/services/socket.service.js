const socketIO = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

let io;

const initialize = (server) => {
  io = socketIO(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      credentials: true
    }
  });

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token?.replace('Bearer ', '');
      
      if (!token) {
        return next(new Error('Authentication error'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId);
      
      if (!user) {
        return next(new Error('User not found'));
      }

      socket.user = {
        userId: user._id,
        role: user.role
      };
      
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    console.log('User connected:', socket.user.userId);

    // Join user's personal room
    socket.join(`user:${socket.user.userId}`);

    // If manager, join team room
    if (socket.user.role === 'manager') {
      socket.join(`team:${socket.user.userId}`);
    }

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.user.userId);
    });
  });
};

// Send notification to a specific user
const notifyUser = (userId, notification) => {
  if (io) {
    io.to(`user:${userId}`).emit('notification', notification);
  }
};

// Send notification to all team members
const notifyTeam = (managerId, notification) => {
  if (io) {
    io.to(`team:${managerId}`).emit('notification', notification);
  }
};

// Send notification about new log
const notifyNewLog = async (log) => {
  try {
    const author = await User.findById(log.userId);
    if (!author) return;

    // If author is a developer, notify their manager
    if (author.role === 'developer' && author.managerId) {
      notifyUser(author.managerId, {
        type: 'new_log',
        message: `${author.name} has submitted a new log`,
        data: {
          logId: log._id,
          authorId: author._id,
          authorName: author.name,
          date: log.date
        }
      });
    }
  } catch (error) {
    console.error('Error sending new log notification:', error);
  }
};

// Send notification about log feedback
const notifyLogFeedback = async (log, feedback) => {
  try {
    const manager = await User.findById(feedback.userId);
    if (!manager) return;

    notifyUser(log.userId, {
      type: 'log_feedback',
      message: `${manager.name} has provided feedback on your log`,
      data: {
        logId: log._id,
        managerId: manager._id,
        managerName: manager.name,
        date: log.date
      }
    });
  } catch (error) {
    console.error('Error sending feedback notification:', error);
  }
};

// Send reminder to submit log
const sendLogReminder = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user || user.role !== 'developer') return;

    notifyUser(userId, {
      type: 'log_reminder',
      message: "Don't forget to submit your daily log!",
      data: {
        timestamp: new Date()
      }
    });
  } catch (error) {
    console.error('Error sending log reminder:', error);
  }
};

module.exports = {
  initialize,
  notifyUser,
  notifyTeam,
  notifyNewLog,
  notifyLogFeedback,
  sendLogReminder
}; 