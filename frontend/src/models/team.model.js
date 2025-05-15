const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  manager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  description: {
    type: String,
    trim: true
  },
  department: {
    type: String,
    trim: true
  },
  settings: {
    logSubmissionDeadline: {
      type: String,
      default: '22:00', // 10 PM
      validate: {
        validator: function(v) {
          return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
        },
        message: props => `${props.value} is not a valid time format (HH:MM)!`
      }
    },
    requireMoodTracking: {
      type: Boolean,
      default: true
    },
    requireBlockerReporting: {
      type: Boolean,
      default: true
    },
    autoReminders: {
      type: Boolean,
      default: true
    }
  },
  stats: {
    averageMood: {
      type: Number,
      default: 0
    },
    completionRate: {
      type: Number,
      default: 0
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  }
}, {
  timestamps: true
});

// Index for efficient querying
teamSchema.index({ manager: 1 });
teamSchema.index({ members: 1 });

// Virtual populate for team logs
teamSchema.virtual('logs', {
  ref: 'WorkLog',
  localField: 'members',
  foreignField: 'user'
});

// Method to get team statistics
teamSchema.methods.calculateStats = async function() {
  const WorkLog = mongoose.model('WorkLog');
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  const logs = await WorkLog.find({
    user: { $in: this.members },
    date: { $gte: oneWeekAgo }
  });

  if (logs.length > 0) {
    // Calculate average mood
    const totalMood = logs.reduce((sum, log) => sum + log.mood.score, 0);
    this.stats.averageMood = totalMood / logs.length;

    // Calculate completion rate
    const expectedLogs = this.members.length * 7; // 7 days
    this.stats.completionRate = (logs.length / expectedLogs) * 100;

    this.stats.lastUpdated = new Date();
    await this.save();
  }

  return this.stats;
};

const Team = mongoose.model('Team', teamSchema);

module.exports = Team; 