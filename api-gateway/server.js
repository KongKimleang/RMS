require('dotenv').config();
const express = require('express');
const jwt = require('jsonwebtoken');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
// NOTE: no express.json() here - the gateway just streams the body to the target service.

const { REGISTRATION_URL, LOGIN_URL, JOB_URL, APPLICATION_URL, JWT_SECRET } = process.env;

// ---------- middleware ----------

// 1) Authentication: is the token valid?  (401 if not)
function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ message: 'Missing token. Use: Authorization: Bearer <token>' });
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    // Overwrite these headers so a client can never fake them
    req.headers['x-user-id'] = payload.userId;
    req.headers['x-user-role'] = payload.role;
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

// 2) Authorization: does this role have access?  (403 if not)
function allow(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Access denied: ${req.user.role} cannot access this resource`
      });
    }
    next();
  };
}

const proxyTo = (target) => createProxyMiddleware({ target, changeOrigin: true });

// ---------- routes ----------

// Public
app.post('/register', proxyTo(REGISTRATION_URL));
app.post('/login', proxyTo(LOGIN_URL));

// Users (ADMIN)
app.get('/users', auth, allow('ADMIN'), proxyTo(REGISTRATION_URL));

// Jobs
app.get('/jobs',        auth, allow('ADMIN', 'CANDIDATE'), proxyTo(JOB_URL));
app.get('/jobs/:id',    auth, allow('ADMIN', 'CANDIDATE'), proxyTo(JOB_URL));
app.post('/jobs',       auth, allow('ADMIN'), proxyTo(JOB_URL));
app.put('/jobs/:id',    auth, allow('ADMIN'), proxyTo(JOB_URL));
app.delete('/jobs/:id', auth, allow('ADMIN'), proxyTo(JOB_URL));

// Applications
app.post('/applications',            auth, allow('CANDIDATE'), proxyTo(APPLICATION_URL));
app.get('/applications/my',          auth, allow('CANDIDATE'), proxyTo(APPLICATION_URL));
app.get('/applications',             auth, allow('ADMIN'),     proxyTo(APPLICATION_URL));
app.put('/applications/:id/status',  auth, allow('ADMIN'),     proxyTo(APPLICATION_URL));

app.get('/health', (req, res) => res.json({ service: 'api-gateway', status: 'ok' }));
app.use((req, res) => res.status(404).json({ message: 'Route not found' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API Gateway running on port ${PORT}`));
