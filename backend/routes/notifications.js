const express = require('express');
const router = express.Router();
const db = require('../models/db');
const { authMiddleware } = require('../middleware/auth');

router.get('/', authMiddleware, (req, res) => {
  try {
    const rows = db.prepare(
      'SELECT n.*, u.username as from_user, u.avatar as from_avatar FROM notifications n LEFT JOIN users u ON n.related_user_id=u.id WHERE n.user_id=? ORDER BY n.created_at DESC LIMIT 50'
    ).all(req.user.id);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/read', authMiddleware, (req, res) => {
  try {
    db.prepare('UPDATE notifications SET is_read=1 WHERE user_id=?').run(req.user.id);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id/read', authMiddleware, (req, res) => {
  try {
    db.prepare('UPDATE notifications SET is_read=1 WHERE id=? AND user_id=?').run(req.params.id, req.user.id);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/unread-count', authMiddleware, (req, res) => {
  try {
    const row = db.prepare('SELECT COUNT(*) as count FROM notifications WHERE user_id=? AND is_read=0').get(req.user.id);
    res.json({ count: row?.count || 0 });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
