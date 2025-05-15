const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  taskDescription: { type: String, required: true },
  timeSpent: { type: Number, required: true }, // in minutes
  mood: { type: Number, min: 1, max: 5, required: true },
  blockers: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  feedback: { type: String },
  reviewed: { type: Boolean, default: false }
});

module.exports = mongoose.model('Log', logSchema); 