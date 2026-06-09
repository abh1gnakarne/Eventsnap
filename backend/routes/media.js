const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../models/db');
const { authMiddleware, optionalAuth } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads/media')),
  filename: (req, file, cb) => { const ext = path.extname(file.originalname); cb(null, `${uuidv4()}${ext}`); }
});
const upload = multer({ storage, limits: { fileSize: 50*1024*1024 } });

const autoTagSets = [
  ['outdoor','nature','landscape'],['people','group','portrait'],
  ['event','celebration','party'],['sports','action','competition'],
  ['art','creative','design'],['campus','college','students'],
  ['music','performance','stage'],['food','dining','culture']
];

// Get media for event
router.get('/event/:eventId', optionalAuth, (req, res) => {
  try {
    const { search, tag } = req.query;
    let rows = db.prepare(
      'SELECT m.*, u.username as uploader_name FROM media m LEFT JOIN users u ON m.uploader_id=u.id WHERE m.event_id=?'
    ).all(req.params.eventId);

    if (search) {
      const s = search.toLowerCase();
      rows = rows.filter(m =>
        (m.caption||'').toLowerCase().includes(s) ||
        (m.tags||'[]').toLowerCase().includes(s) ||
        (m.uploader_name||'').toLowerCase().includes(s)
      );
    }
    if (tag) rows = rows.filter(m => (m.tags||'[]').toLowerCase().includes(tag.toLowerCase()));

    rows.sort((a,b) => (b.created_at||'').localeCompare(a.created_at||''));

    const result = rows.map(m => ({
      ...m,
      tags: (() => { try { return JSON.parse(m.tags||'[]'); } catch { return []; } })(),
      like_count: db.prepare('SELECT COUNT(*) as c FROM likes WHERE media_id=?').get(m.id)?.c || 0,
      comment_count: db.prepare('SELECT COUNT(*) as c FROM comments WHERE media_id=?').get(m.id)?.c || 0,
      liked: req.user ? !!db.prepare('SELECT id FROM likes WHERE media_id=? AND user_id=?').get(m.id, req.user.id) : false,
      favourited: req.user ? !!db.prepare('SELECT id FROM favourites WHERE media_id=? AND user_id=?').get(m.id, req.user.id) : false,
    }));
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Upload
router.post('/upload', authMiddleware, upload.array('files', 20), (req, res) => {
  try {
    const { event_id, caption, is_public, tags: rawTags } = req.body;
    if (!event_id || !req.files?.length) return res.status(400).json({ error: 'event_id and files required' });
    const inserted = [];
    for (const file of req.files) {
      const id = uuidv4();
      const isPhoto = file.mimetype.startsWith('image/');
      const autoTags = autoTagSets[Math.floor(Math.random() * autoTagSets.length)];
      const userTags = rawTags ? rawTags.split(',').map(t=>t.trim()).filter(Boolean) : [];
      const allTags = [...new Set([...autoTags, ...userTags])];
      db.prepare('INSERT INTO media (id,event_id,uploader_id,filename,original_name,file_type,file_size,tags,caption,is_public) VALUES (?,?,?,?,?,?,?,?,?,?)')
        .run(id, event_id, req.user.id, file.filename, file.originalname, isPhoto?'photo':'video', file.size, JSON.stringify(allTags), caption||'', is_public==='false'?0:1);
      inserted.push({ id, filename: file.filename, tags: allTags });
    }
    const event = db.prepare('SELECT name FROM events WHERE id=?').get(event_id);
    const members = db.prepare('SELECT user_id FROM event_members WHERE event_id=?').all(event_id);
    for (const m of members) {
      if (m.user_id !== req.user.id) {
        db.prepare('INSERT INTO notifications (id,user_id,type,message,related_media_id,related_user_id) VALUES (?,?,?,?,?,?)')
          .run(uuidv4(), m.user_id, 'upload', `New photos uploaded to ${event?.name||'an event'}`, inserted[0]?.id||'', req.user.id);
      }
    }
    res.json({ uploaded: inserted.length, media: inserted });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Serve file
router.get('/file/:filename', (req, res) => {
  const fp = path.join(__dirname, '../uploads/media', req.params.filename);
  if (!fs.existsSync(fp)) return res.status(404).json({ error: 'Not found' });
  res.sendFile(fp);
});

// Download with watermark
router.get('/download/:id', optionalAuth, async (req, res) => {
  try {
    const media = db.prepare('SELECT m.*, e.name as event_name FROM media m LEFT JOIN events e ON m.event_id=e.id WHERE m.id=?').get(req.params.id);
    if (!media) return res.status(404).json({ error: 'Not found' });
    const fp = path.join(__dirname, '../uploads/media', media.filename);
    if (!fs.existsSync(fp)) return res.status(404).json({ error: 'File not found' });
    const ext = path.extname(media.filename).toLowerCase();
    if (['.jpg','.jpeg','.png','.webp'].includes(ext)) {
      try {
        const sharp = require('sharp');
        const wm = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="420" height="52"><rect width="420" height="52" fill="rgba(0,0,0,0.5)" rx="6"/><text x="12" y="34" font-family="Arial" font-size="20" fill="white">📸 EventSnap | ${(media.event_name||'Event').slice(0,20)}</text></svg>`);
        const out = await sharp(fp).composite([{ input: wm, gravity: 'southeast' }]).jpeg({ quality: 90 }).toBuffer();
        res.setHeader('Content-Disposition', `attachment; filename="eventsnap_${media.original_name||media.filename}"`);
        res.setHeader('Content-Type', 'image/jpeg');
        return res.send(out);
      } catch (e) { /* fall through */ }
    }
    res.download(fp, media.original_name||media.filename);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Search all media
router.get('/search/all', optionalAuth, (req, res) => {
  try {
    const { q, tag, event_id, uploader } = req.query;
    let rows = db.prepare(
      'SELECT m.*, u.username as uploader_name, e.name as event_name FROM media m LEFT JOIN users u ON m.uploader_id=u.id LEFT JOIN events e ON m.event_id=e.id'
    ).all();
    if (q) {
      const s = q.toLowerCase();
      rows = rows.filter(m =>
        (m.caption||'').toLowerCase().includes(s)||
        (m.tags||'').toLowerCase().includes(s)||
        (m.uploader_name||'').toLowerCase().includes(s)||
        (m.event_name||'').toLowerCase().includes(s)
      );
    }
    if (tag) rows = rows.filter(m => (m.tags||'').toLowerCase().includes(tag.toLowerCase()));
    if (event_id) rows = rows.filter(m => m.event_id === event_id);
    if (uploader) rows = rows.filter(m => (m.uploader_name||'').toLowerCase().includes(uploader.toLowerCase()));
    rows.sort((a,b) => (b.created_at||'').localeCompare(a.created_at||''));
    res.json(rows.slice(0,50).map(m => ({
      ...m,
      tags: (() => { try { return JSON.parse(m.tags||'[]'); } catch { return []; } })(),
      like_count: db.prepare('SELECT COUNT(*) as c FROM likes WHERE media_id=?').get(m.id)?.c || 0,
    })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// User favourites
router.get('/user/favourites', authMiddleware, (req, res) => {
  try {
    const rows = db.prepare(
      'SELECT m.*, u.username as uploader_name FROM favourites f JOIN media m ON f.media_id=m.id LEFT JOIN users u ON m.uploader_id=u.id WHERE f.user_id=? ORDER BY f.created_at DESC'
    ).all(req.user.id);
    res.json(rows.map(m => ({ ...m, tags: (() => { try { return JSON.parse(m.tags||'[]'); } catch { return []; } })(), favourited: true })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Tagged photos
router.get('/user/tagged', authMiddleware, (req, res) => {
  try {
    const rows = db.prepare(
      'SELECT m.*, u.username as uploader_name, e.name as event_name FROM tags t JOIN media m ON t.media_id=m.id LEFT JOIN users u ON m.uploader_id=u.id LEFT JOIN events e ON m.event_id=e.id WHERE t.tagged_user_id=? ORDER BY t.created_at DESC'
    ).all(req.user.id);
    res.json(rows.map(m => ({ ...m, tags: (() => { try { return JSON.parse(m.tags||'[]'); } catch { return []; } })() })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// My uploads
router.get('/user/my-uploads', authMiddleware, (req, res) => {
  try {
    const rows = db.prepare(
      'SELECT m.*, e.name as event_name FROM media m LEFT JOIN events e ON m.event_id=e.id WHERE m.uploader_id=? ORDER BY m.created_at DESC'
    ).all(req.user.id);
    res.json(rows.map(m => ({
      ...m,
      tags: (() => { try { return JSON.parse(m.tags||'[]'); } catch { return []; } })(),
      like_count: db.prepare('SELECT COUNT(*) as c FROM likes WHERE media_id=?').get(m.id)?.c || 0,
      comment_count: db.prepare('SELECT COUNT(*) as c FROM comments WHERE media_id=?').get(m.id)?.c || 0,
    })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Single media
router.get('/:id', optionalAuth, (req, res) => {
  try {
    const m = db.prepare('SELECT m.*, u.username as uploader_name FROM media m LEFT JOIN users u ON m.uploader_id=u.id WHERE m.id=?').get(req.params.id);
    if (!m) return res.status(404).json({ error: 'Not found' });
    db.prepare('UPDATE media SET views=views+1 WHERE id=?').run(m.id);
    res.json({ ...m, tags: (() => { try { return JSON.parse(m.tags||'[]'); } catch { return []; } })() });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Like/Unlike
router.post('/:id/like', authMiddleware, (req, res) => {
  try {
    const existing = db.prepare('SELECT id FROM likes WHERE media_id=? AND user_id=?').get(req.params.id, req.user.id);
    if (existing) {
      db.prepare('DELETE FROM likes WHERE media_id=? AND user_id=?').run(req.params.id, req.user.id);
      res.json({ liked: false });
    } else {
      db.prepare('INSERT INTO likes (id,media_id,user_id) VALUES (?,?,?)').run(uuidv4(), req.params.id, req.user.id);
      const media = db.prepare('SELECT uploader_id FROM media WHERE id=?').get(req.params.id);
      if (media && media.uploader_id !== req.user.id) {
        db.prepare('INSERT INTO notifications (id,user_id,type,message,related_media_id,related_user_id) VALUES (?,?,?,?,?,?)')
          .run(uuidv4(), media.uploader_id, 'like', `${req.user.username} liked your photo`, req.params.id, req.user.id);
      }
      res.json({ liked: true });
    }
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Comments
router.get('/:id/comments', optionalAuth, (req, res) => {
  try {
    const rows = db.prepare('SELECT c.*, u.username, u.avatar FROM comments c LEFT JOIN users u ON c.user_id=u.id WHERE c.media_id=? ORDER BY c.created_at ASC').all(req.params.id);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/comments', authMiddleware, (req, res) => {
  try {
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: 'Content required' });
    const id = uuidv4();
    db.prepare('INSERT INTO comments (id,media_id,user_id,content) VALUES (?,?,?,?)').run(id, req.params.id, req.user.id, content);
    const media = db.prepare('SELECT uploader_id FROM media WHERE id=?').get(req.params.id);
    if (media && media.uploader_id !== req.user.id) {
      db.prepare('INSERT INTO notifications (id,user_id,type,message,related_media_id,related_user_id) VALUES (?,?,?,?,?,?)')
        .run(uuidv4(), media.uploader_id, 'comment', `${req.user.username} commented on your photo`, req.params.id, req.user.id);
    }
    const comment = db.prepare('SELECT c.*, u.username, u.avatar FROM comments c LEFT JOIN users u ON c.user_id=u.id WHERE c.id=?').get(id);
    res.json(comment);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id/comments/:commentId', authMiddleware, (req, res) => {
  try {
    db.prepare('DELETE FROM comments WHERE id=? AND user_id=?').run(req.params.commentId, req.user.id);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Favourite
router.post('/:id/favourite', authMiddleware, (req, res) => {
  try {
    const existing = db.prepare('SELECT id FROM favourites WHERE media_id=? AND user_id=?').get(req.params.id, req.user.id);
    if (existing) {
      db.prepare('DELETE FROM favourites WHERE media_id=? AND user_id=?').run(req.params.id, req.user.id);
      res.json({ favourited: false });
    } else {
      db.prepare('INSERT INTO favourites (id,media_id,user_id) VALUES (?,?,?)').run(uuidv4(), req.params.id, req.user.id);
      res.json({ favourited: true });
    }
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Tag user
router.post('/:id/tag', authMiddleware, (req, res) => {
  try {
    const { tagged_user_id } = req.body;
    if (!tagged_user_id) return res.status(400).json({ error: 'tagged_user_id required' });
    const existing = db.prepare('SELECT id FROM tags WHERE media_id=? AND tagged_user_id=?').get(req.params.id, tagged_user_id);
    if (!existing) {
      db.prepare('INSERT INTO tags (id,media_id,tagged_user_id,tagged_by) VALUES (?,?,?,?)').run(uuidv4(), req.params.id, tagged_user_id, req.user.id);
      db.prepare('INSERT INTO notifications (id,user_id,type,message,related_media_id,related_user_id) VALUES (?,?,?,?,?,?)')
        .run(uuidv4(), tagged_user_id, 'tag', `${req.user.username} tagged you in a photo`, req.params.id, req.user.id);
    }
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Delete media
router.delete('/:id', authMiddleware, (req, res) => {
  try {
    const media = db.prepare('SELECT * FROM media WHERE id=?').get(req.params.id);
    if (!media) return res.status(404).json({ error: 'Not found' });
    if (media.uploader_id !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    const fp = path.join(__dirname, '../uploads/media', media.filename);
    if (fs.existsSync(fp)) fs.unlinkSync(fp);
    db.prepare('DELETE FROM likes WHERE media_id=?').run(req.params.id);
    db.prepare('DELETE FROM comments WHERE media_id=?').run(req.params.id);
    db.prepare('DELETE FROM favourites WHERE media_id=?').run(req.params.id);
    db.prepare('DELETE FROM tags WHERE media_id=?').run(req.params.id);
    db.prepare('DELETE FROM media WHERE id=?').run(req.params.id);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
