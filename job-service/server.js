require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const Job = require('./models/Job');

const app = express();
app.use(express.json());

const INSTANCE = process.env.INSTANCE_NAME || 'job-instance';

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => { console.error('DB error:', err.message); process.exit(1); });

// POST /jobs  (ADMIN) - create
app.post('/jobs', async (req, res) => {
  try {
    const { title, description, location, salary } = req.body;
    if (!title || !description) {
      return res.status(400).json({ message: 'title and description are required' });
    }
    const job = await Job.create({
      title, description, location, salary,
      createdBy: req.headers['x-user-id']       // set by the API Gateway
    });
    res.status(201).json({ message: 'Job created', job });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /jobs  (ADMIN, CANDIDATE) - list all
// "servedBy" proves which instance answered (used for the load-balancer demo)
app.get('/jobs', async (req, res) => {
  const jobs = await Job.find().sort({ createdAt: -1 });
  res.json({ servedBy: INSTANCE, count: jobs.length, jobs });
});

// GET /jobs/:id  (ADMIN, CANDIDATE) - one job
app.get('/jobs/:id', async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ message: 'Job not found' });
    res.json({ servedBy: INSTANCE, job });
  } catch (err) {
    res.status(400).json({ message: 'Invalid job id' });
  }
});

// PUT /jobs/:id  (ADMIN) - update
app.put('/jobs/:id', async (req, res) => {
  try {
    const { title, description, location, salary } = req.body;
    const job = await Job.findByIdAndUpdate(
      req.params.id,
      { title, description, location, salary },
      { new: true, runValidators: true, omitUndefined: true }
    );
    if (!job) return res.status(404).json({ message: 'Job not found' });
    res.json({ message: 'Job updated', job });
  } catch (err) {
    res.status(400).json({ message: 'Invalid job id or data' });
  }
});

// DELETE /jobs/:id  (ADMIN)
app.delete('/jobs/:id', async (req, res) => {
  try {
    const job = await Job.findByIdAndDelete(req.params.id);
    if (!job) return res.status(404).json({ message: 'Job not found' });
    res.json({ message: 'Job deleted' });
  } catch (err) {
    res.status(400).json({ message: 'Invalid job id' });
  }
});

app.get('/health', (req, res) => res.json({ service: 'job', instance: INSTANCE, status: 'ok' }));

const PORT = process.env.PORT || 5003;
app.listen(PORT, () => console.log(`Job service (${INSTANCE}) running on port ${PORT}`));
