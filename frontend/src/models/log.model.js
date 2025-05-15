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
  }]
});

const logSchema = new mongoose.Schema({
  userId: {
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
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  blockers: {
    type: String,
    trim: true
  },
  aiSummary: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['draft', 'submitted', 'reviewed'],
    default: 'submitted'
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewedAt: Date,
  feedback: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    message: {
      type: String,
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  totalTimeSpent: {
    type: Number, // Store in minutes for easy calculations
    default: 0
  }
}, {
  timestamps: true
});

// Calculate total time spent before saving
logSchema.pre('save', function(next) {
  this.totalTimeSpent = this.tasks.reduce((total, task) => {
    return total + (task.timeSpent.hours * 60) + task.timeSpent.minutes;
  }, 0);
  next();
});

// Virtual for getting total time in hours and minutes
logSchema.virtual('formattedTotalTime').get(function() {
  const hours = Math.floor(this.totalTimeSpent / 60);
  const minutes = this.totalTimeSpent % 60;
  return { hours, minutes };
});

// Index for efficient querying
logSchema.index({ userId: 1, date: -1 });
logSchema.index({ date: -1 });

const Log = mongoose.model('Log', logSchema);

module.exports = Log; 