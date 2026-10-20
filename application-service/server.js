require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const Application = require('./models/Application');

const app = express();
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => { console.error('DB error:', err.message); process.exit(1); });

// POST /applications  (CANDIDATE) - apply to a job
app.post('/applications', async (req, res) => {
  try {
    const { jobId, resumeLink } = req.body;
    if (!jobId || !resumeLink) {
      return res.status(400).json({ message: 'jobId and resumeLink are required' });
    }

    // Service-to-service call: make sure the job really exists
    let jobRes;
    try {
      jobRes = await fetch(`${process.env.JOB_URL}/jobs/${jobId}`);
    } catch (e) {
      return res.status(503).json({ message: 'Job service unavailable' });
    }
    if (!jobRes.ok) return res.status(404).json({ message: 'Job not found' });

    const application = await Application.create({
      jobId,
      resumeLink,
      candidateId: req.headers['x-user-id']
    });
    res.status(201).json({ message: 'Application submitted', application });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: 'You already applied to this job' });
    }
    res.status(500).json({ message: err.message });
  }
});

// GET /applications/my  (CANDIDATE) - my own applications
app.get('/applications/my', async (req, res) => {
  const list = await Application.find({ candidateId: req.headers['x-user-id'] })
    .sort({ appliedAt: -1 });
  res.json({ count: list.length, applications: list });
});

// GET /applications  (ADMIN) - all applications, optional ?jobId=...
app.get('/applications', async (req, res) => {
  const filter = req.query.jobId ? { jobId: req.query.jobId } : {};
  const list = await Application.find(filter).sort({ appliedAt: -1 });
  res.json({ count: list.length, applications: list });
});

// PUT /applications/:id/status  (ADMIN) - Shortlisted or Rejected
app.put('/applications/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!['Shortlisted', 'Rejected'].includes(status)) {
      return res.status(400).json({ message: 'status must be Shortlisted or Rejected' });
    }
    const application = await Application.findByIdAndUpdate(
      req.params.id, { status }, { new: true }
    );
    if (!application) return res.status(404).json({ message: 'Application not found' });
    res.json({ message: 'Status updated', application });
  } catch (err) {
    res.status(400).json({ message: 'Invalid application id' });
  }
});

app.get('/health', (req, res) => res.json({ service: 'application', status: 'ok' }));

const PORT = process.env.PORT || 5004;
app.listen(PORT, () => console.log(`Application service running on port ${PORT}`));
