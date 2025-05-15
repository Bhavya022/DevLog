const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  role: {
    type: String,
    enum: ['developer', 'manager'],
    required: true
  },
  managerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: function() {
      return this.role === 'developer';
    }
  },
  team: {
    type: String,
    required: function() {
      return this.role === 'developer';
    }
  },
  avatar: {
    type: String,
    default: null
  },
  lastActive: {
    type: Date,
    default: Date.now
  },
  preferences: {
    darkMode: {
      type: Boolean,
      default: false
    },
    emailNotifications: {
      type: Boolean,
      default: true
    },
    slackNotifications: {
      type: Boolean,
      default: true
    }
  },
  logStreak: {
    type: Number,
    default: 0
  },
  achievements: [
    {
      type: String,
      trim: true
    }
  ]
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Method to get user's team members (if manager)
userSchema.methods.getTeamMembers = async function() {
  if (this.role !== 'manager') return [];
  return this.model('User').find({ managerId: this._id });
};

const User = mongoose.model('User', userSchema);

module.exports = User; 