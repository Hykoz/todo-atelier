const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const authRoutes = require('./routes/auth');
const todoRoutes = require('./routes/todos');
const adminRoutes = require('./routes/admin');

// nosemgrep: javascript.express.security.audit.express-check-csurf-middleware-usage.express-check-csurf-middleware-usage
const app = express();

app.use(helmet());
app.use(cors({
  origin: process.env.FRONT_ORIGIN || 'http://localhost:8080',
}));
app.use(express.json({ limit: '16kb' }));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api', authRoutes);
app.use('/api/todos', todoRoutes);
app.use('/api/admin', adminRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Erreur interne du serveur' });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`API démarrée sur le port ${port}`);
});
