const express = require('express');
const pool = require('../db');
const { hashPassword, verifyPassword, signToken } = require('../auth');

const router = express.Router();

// Limitation de débit (Rate Limiting) contre la force brute
const loginAttempts = new Map();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

function rateLimiter(req, res, next) {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const record = loginAttempts.get(ip);

  if (record && now - record.start < WINDOW_MS) {
    if (record.count >= MAX_ATTEMPTS) {
      return res.status(429).json({
        error: 'Trop de tentatives. Veuillez réessayer plus tard.',
      });
    }
    record.count += 1;
  } else {
    loginAttempts.set(ip, { count: 1, start: now });
  }
  next();
}

router.post('/register', rateLimiter, async (req, res, next) => {
  try {
    const { username, password, email } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Nom d’utilisateur et mot de passe requis' });
    }
    if (typeof username !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: 'Format des données invalide' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 8 caractères' });
    }

    const existing = await pool.query('SELECT id FROM users WHERE username = $1', [username.trim()]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Ce nom d’utilisateur existe déjà' });
    }

    // Correction Mass Assignment : le rôle est forcé à 'user' (jamais lu depuis req.body.role)
    const result = await pool.query(
      'INSERT INTO users (username, password, email, role) VALUES ($1, $2, $3, $4) RETURNING id, username, role',
      [username.trim(), hashPassword(password), email ? String(email).trim() : null, 'user']
    );
    const user = result.rows[0];
    res.status(201).json({ token: signToken(user), user });
  } catch (err) {
    next(err);
  }
});

router.post('/login', rateLimiter, async (req, res, next) => {
  try {
    const { username, password } = req.body;
    if (!username || !password || typeof username !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: 'Nom d’utilisateur et mot de passe requis' });
    }

    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username.trim()]);
    const user = result.rows[0];

    // Message d'erreur générique pour éviter l'énumération des comptes
    if (!user || !verifyPassword(password, user.password)) {
      return res.status(401).json({ error: 'Identifiants incorrects' });
    }

    // Réinitialiser le compteur après connexion réussie
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    loginAttempts.delete(ip);

    // Migration transparente des anciens hashs MD5 vers scrypt avec sel
    if (!user.password.includes(':')) {
      const upgradedHash = hashPassword(password);
      await pool.query('UPDATE users SET password = $1 WHERE id = $2', [upgradedHash, user.id]);
    }

    res.json({
      token: signToken(user),
      user: { id: user.id, username: user.username, role: user.role },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
