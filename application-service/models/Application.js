const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
  jobId:       { type: String, required: true },
  candidateId: { type: String, required: true },   // from the Gateway header
  resumeLink:  { type: String, required: true },
  status:      { type: String, enum: ['Pending', 'Shortlisted', 'Rejected'], default: 'Pending' },
  appliedAt:   { type: Date, default: Date.now }
});

// one candidate can apply to a job only once
applicationSchema.index({ jobId: 1, candidateId: 1 }, { unique: true });

module.exports = mongoose.model('Application', applicationSchema, 'RMS-applications');
