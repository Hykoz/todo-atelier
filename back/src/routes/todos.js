const express = require('express');
const pool = require('../db');
const { authenticate } = require('../auth');

const router = express.Router();

router.use(authenticate);

// Liste des tâches de l’utilisateur connecté, avec recherche optionnelle
router.get('/', async (req, res, next) => {
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
  const params = [req.user.id];
  let sql = 'SELECT * FROM todos WHERE user_id = $1';

  if (search) {
    params.push(`%${search}%`);
    sql += ` AND title ILIKE $${params.length}`;
  }
  sql += ' ORDER BY created_at DESC, id DESC';

  try {
    const result = await pool.query(sql, params);
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT * FROM todos WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tâche introuvable' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { title, description } = req.body;
    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ error: 'Le titre est obligatoire' });
    }
    const result = await pool.query(
      'INSERT INTO todos (user_id, title, description) VALUES ($1, $2, $3) RETURNING *',
      [req.user.id, title.trim(), description ? String(description) : '']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const { title, description, done } = req.body;
    const result = await pool.query(
      `UPDATE todos
          SET title = COALESCE($1, title),
              description = COALESCE($2, description),
              done = COALESCE($3, done)
        WHERE id = $4 AND user_id = $5
        RETURNING *`,
      [title ?? null, description ?? null, done ?? null, req.params.id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tâche introuvable' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const result = await pool.query(
      'DELETE FROM todos WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tâche introuvable' });
    }
    res.json({ deleted: result.rows[0].id });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
