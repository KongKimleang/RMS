const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name:     { type: String, required: true },
  email:    { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },   // stored hashed
  role:     { type: String, enum: ['ADMIN', 'CANDIDATE'], default: 'CANDIDATE' },
  createdAt:{ type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema, 'RMS-users');
