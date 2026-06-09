const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../models/db');
const { authMiddleware, optionalAuth } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const upload = multer({ dest: path.join(__dirname, '../uploads/media') });

router.get('/', optionalAuth, (req, res) => {
  try {
    const { search, category, sort = 'created_at' } = req.query;
    let rows = db.prepare('SELECT e.*, u.username as creator_name FROM events e LEFT JOIN users u ON e.created_by = u.id').all();
    if (!req.user) rows = rows.filter(e => e.is_public == 1);
    if (search) {
      const s = search.toLowerCase();
      rows = rows.filter(e => (e.name||'').toLowerCase().includes(s) || (e.description||'').toLowerCase().includes(s));
    }
    if (category && category !== 'all') rows = rows.filter(e => e.category === category);
    rows = rows.map(e => ({
      ...e,
      media_count: db.prepare('SELECT COUNT(*) as c FROM media WHERE event_id=?').get(e.id)?.c || 0
    }));
    if (sort === 'name') rows.sort((a,b) => (a.name||'').localeCompare(b.name||''));
    else if (sort === 'date') rows.sort((a,b) => (b.date||'').localeCompare(a.date||''));
    else rows.sort((a,b) => (b.created_at||'').localeCompare(a.created_at||''));
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', optionalAuth, (req, res) => {
  try {
    const event = db.prepare('SELECT e.*, u.username as creator_name FROM events e LEFT JOIN users u ON e.created_by=u.id WHERE e.id=?').get(req.params.id);
    if (!event) return res.status(404).json({ error: 'Not found' });
    if (!event.is_public && !req.user) return res.status(403).json({ error: 'Private event' });
    res.json(event);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', authMiddleware, upload.single('cover'), (req, res) => {
  try {
    const { name, description, category, date, location, is_public } = req.body;
    if (!name) return res.status(400).json({ error: 'Name required' });
    const id = uuidv4();
    let cover_image = null;
    if (req.file) {
      const ext = path.extname(req.file.originalname) || '.jpg';
      const newName = `cover_${id}${ext}`;
      const dest = path.join(__dirname, '../uploads/media', newName);
      fs.renameSync(req.file.path, dest);
      cover_image = newName;
    }
    db.prepare('INSERT INTO events (id,name,description,category,date,location,cover_image,is_public,created_by) VALUES (?,?,?,?,?,?,?,?,?)')
      .run(id, name, description||'', category||'general', date||'', location||'', cover_image||'', is_public === 'false' ? 0 : 1, req.user.id);
    res.json({ id, name });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', authMiddleware, (req, res) => {
  try {
    const event = db.prepare('SELECT * FROM events WHERE id=?').get(req.params.id);
    if (!event) return res.status(404).json({ error: 'Not found' });
    if (event.created_by !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    const { name, description, category, date, location, is_public } = req.body;
    db.prepare('UPDATE events SET name=?,description=?,category=?,date=?,location=?,is_public=? WHERE id=?')
      .run(name||event.name, description||'', category||event.category, date||'', location||'', is_public ? 1 : 0, req.params.id);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', authMiddleware, (req, res) => {
  try {
    const event = db.prepare('SELECT * FROM events WHERE id=?').get(req.params.id);
    if (!event) return res.status(404).json({ error: 'Not found' });
    if (event.created_by !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    db.prepare('DELETE FROM media WHERE event_id=?').run(req.params.id);
    db.prepare('DELETE FROM events WHERE id=?').run(req.params.id);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
