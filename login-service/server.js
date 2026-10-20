require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('./models/User');

const app = express();
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => { console.error('DB error:', err.message); process.exit(1); });

// POST /login  (public)
app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'email and password are required' });
    }
    const user = await User.findOne({ email: email.toLowerCase() });
    // same message for both cases so attackers can't tell which was wrong
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    res.json({ message: 'Login successful', token, role: user.role });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/health', (req, res) => res.json({ service: 'login', status: 'ok' }));

const PORT = process.env.PORT || 5002;
app.listen(PORT, () => console.log(`Login service running on port ${PORT}`));
