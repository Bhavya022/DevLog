const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  description: {
    type: String,
    required: true
  },
  timeSpent: {
    hours: {
      type: Number,
      required: true,
      min: 0
    },
    minutes: {
      type: Number,
      required: true,
      min: 0,
      max: 59
    }
  },
  tags: [{
    type: String,
    trim: true
  }],
  status: {
    type: String,
    enum: ['completed', 'in-progress', 'blocked'],
    default: 'completed'
  }
}, { _id: true });

const workLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  tasks: [taskSchema],
  mood: {
    score: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    emoji: {
      type: String,
      required: true,
      enum: ['😢', '😕', '😐', '🙂', '😄']
    }
  },
  blockers: {
    type: String,
    trim: true
  },
  summary: {
    type: String,
    trim: true
  },
  aiSummary: {
    type: String,
    trim: true
  },
  totalTimeSpent: {
    hours: {
      type: Number,
      default: 0
    },
    minutes: {
      type: Number,
      default: 0
    }
  },
  status: {
    type: String,
    enum: ['Needs Clarification', 'Approved', 'Pending'],
    default: 'Pending'
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewedAt: Date,
  feedback: [
    {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      comment: {
        type: String,
        required: true
      },
      createdAt: {
        type: Date,
        default: Date.now
      }
    }
  ],
  streak: {
    type: Number,
    default: 1
  }
}, {
  timestamps: true
});

// Pre-save middleware to calculate total time spent
workLogSchema.pre('save', function(next) {
  let totalHours = 0;
  let totalMinutes = 0;

  this.tasks.forEach(task => {
    totalHours += task.timeSpent.hours;
    totalMinutes += task.timeSpent.minutes;
  });

  // Convert excess minutes to hours
  totalHours += Math.floor(totalMinutes / 60);
  totalMinutes = totalMinutes % 60;

  this.totalTimeSpent = {
    hours: totalHours,
    minutes: totalMinutes
  };

  next();
});

// Index for efficient querying
workLogSchema.index({ user: 1, date: -1 });
workLogSchema.index({ 'tasks.tags': 1 });

const WorkLog = mongoose.model('WorkLog', workLogSchema);

module.exports = WorkLog; 