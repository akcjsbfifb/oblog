const { Router } = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const config = require('../config');
const { optionalAuth } = require('../middleware/auth');
const { applyLayout, applyLayoutSimple } = require('../views/helpers');

const router = Router();

const loginFormHtml = fs.readFileSync(path.join(__dirname, '..', 'views', 'login.html'), 'utf-8');

function renderLogin(error, redirect) {
  let html = loginFormHtml;

  if (error) {
    html = '<div class="callout callout-danger" style="margin-bottom:1rem"><div class="callout-title">Error</div>' + error + '</div>\n' + html;
  } else {
    html = html.replace(/<div class="callout callout-danger"[\s\S]*?<\/div>\n?/g, '');
  }

  // Remove mustache comments
  html = html
    .replace(/\{\{#error\}\}/g, '')
    .replace(/\{\{\/error\}\}/g, '')
    .replace(/\{\{error\}\}/g, '')
    .replace(/\{\{#redirect\}\}/g, '')
    .replace(/\{\{\/redirect\}\}/g, '')
    .replace('{{redirect}}', redirect || '');

  return html;
}

// GET /login
router.get('/login', optionalAuth, (req, res) => {
  if (req.user) {
    return res.redirect(req.query.redirect || '/vault');
  }
  const html = applyLayoutSimple('Login', renderLogin(null, req.query.redirect), false, '');
  res.send(html);
});

// POST /login
router.post('/login', (req, res) => {
  const { username, password, redirect } = req.body;

  let valid = false;

  if (username === config.adminUsername) {
    if (!config.adminPasswordHash) {
      // First run: auto-set password hash with bcrypt of 'admin'
      config.adminPasswordHash = bcrypt.hashSync('admin', 10);
      console.log('[auth] Default password hash generated. Use: ADMIN_PASSWORD_HASH=' + config.adminPasswordHash);
      console.log('[auth] Default password is "admin". Change it immediately.');
    }
    valid = bcrypt.compareSync(password, config.adminPasswordHash);
  }

  if (!valid) {
    const html = applyLayoutSimple('Login', renderLogin('Invalid username or password', redirect), false, '');
    return res.status(401).send(html);
  }

  const token = jwt.sign(
    { username, role: 'admin' },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );

  res.cookie('token', token, {
    httpOnly: true,
    secure: config.nodeEnv === 'production',
    sameSite: 'strict',
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });

  res.redirect(redirect || '/vault');
});

// POST /logout
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.redirect('/');
});

module.exports = router;
