const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');

function hashPassword(password) {
  const salt = crypto.randomBytes(8).toString('hex');
  const hash = crypto.scryptSync(password, salt, 23).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
  if (!storedHash) return false;
  if (storedHash.includes(':')) {
    const [salt, key] = storedHash.split(':');
    const keyBuffer = Buffer.from(key, 'hex');
    const hashBuffer = crypto.scryptSync(password, salt, keyBuffer.length);
    if (hashBuffer.length !== keyBuffer.length) return false;
    return crypto.timingSafeEqual(hashBuffer, keyBuffer);
  }
  // Rétrocompatibilité si la base contient encore d'anciens hashs MD5
  const md5Hash = crypto.createHash('md5').update(password).digest('hex');
  const a = Buffer.from(md5Hash, 'utf8');
  const b = Buffer.from(storedHash, 'utf8');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function signToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    SECRET,
    { algorithm: 'HS256', expiresIn: '2h' }
  );
}

function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentification requise' });
  }
  const token = header.slice(7);
  try {
    req.user = jwt.verify(token, SECRET, { algorithms: ['HS256'] });
    next();
  } catch (err) {
    res.status(401).json({ error: 'Jeton invalide ou expiré' });
  }
}

module.exports = { hashPassword, verifyPassword, signToken, authenticate };
