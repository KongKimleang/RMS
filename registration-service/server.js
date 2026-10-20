require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

const app = express();
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => { console.error('DB error:', err.message); process.exit(1); });

// POST /register  (public)
app.post('/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'name, email and password are required' });
    }
    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) return res.status(400).json({ message: 'Email already registered' });

    const hashed = await bcrypt.hash(password, 10);
    // mini-project shortcut: role comes from the request body
    const user = await User.create({
      name, email, password: hashed,
      role: role === 'ADMIN' ? 'ADMIN' : 'CANDIDATE'
    });
    res.status(201).json({ message: 'Registered successfully', userId: user._id, role: user.role });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /users  (ADMIN only - enforced by the API Gateway in Step 3)
app.get('/users', async (req, res) => {
  const users = await User.find().select('-password');
  res.json(users);
});

app.get('/health', (req, res) => res.json({ service: 'registration', status: 'ok' }));

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Registration service running on port ${PORT}`));
