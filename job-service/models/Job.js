const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  title:       { type: String, required: true },
  description: { type: String, required: true },
  location:    { type: String, default: 'Remote' },
  salary:      { type: Number, default: 0 },
  createdBy:   { type: String, required: true },   // admin's userId (from the Gateway header)
  createdAt:   { type: Date, default: Date.now }
});

module.exports = mongoose.model('Job', jobSchema, 'RMS-jobs');
