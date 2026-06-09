const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const multer = require('multer');
const db = require('../models/db');
const { authMiddleware } = require('../middleware/auth');

const MEDIA_DIR = path.join(__dirname, '../uploads/media');
const SELFIE_DIR = path.join(__dirname, '../uploads/selfies');
if (!fs.existsSync(SELFIE_DIR)) fs.mkdirSync(SELFIE_DIR, { recursive: true });

const selfieStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, SELFIE_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `selfie_${req.user.id}${ext}`);
  }
});
const selfieUpload = multer({ storage: selfieStorage, limits: { fileSize: 10 * 1024 * 1024 } });

const PYTHON = process.env.PYTHON_PATH || 'python3';
const FR_SCRIPT = path.join(__dirname, '../face_recognition_service.py');

/**
 * Run python face recognition service as child process
 */
function runFaceService(args, timeoutMs = 60000) {
  return new Promise((resolve, reject) => {
    const proc = spawn(PYTHON, [FR_SCRIPT, ...args]);
    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', d => stdout += d.toString());
    proc.stderr.on('data', d => stderr += d.toString());

    const timer = setTimeout(() => {
      proc.kill();
      reject(new Error('Face recognition timed out'));
    }, timeoutMs);

    proc.on('close', code => {
      clearTimeout(timer);
      if (!stdout.trim()) {
        reject(new Error(`No output from face service. stderr: ${stderr}`));
        return;
      }
      try {
        resolve(JSON.parse(stdout.trim()));
      } catch (e) {
        reject(new Error(`JSON parse error: ${stdout} | ${stderr}`));
      }
    });

    proc.on('error', err => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

/**
 * POST /api/face/upload-selfie
 * Upload a reference selfie and extract face encoding
 */
router.post('/upload-selfie', authMiddleware, selfieUpload.single('selfie'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No selfie uploaded' });

    const selfiePath = req.file.path;

    // Extract face encoding from selfie
    const result = await runFaceService(['extract_encoding', selfiePath]);

    if (!result.success) {
      // Remove the uploaded file since no face found
      fs.unlinkSync(selfiePath);
      return res.status(400).json({
        error: result.error || 'No face detected in selfie',
        tip: 'Please use a clear, well-lit front-facing photo with your face clearly visible'
      });
    }

    // Store encoding in DB for this user
    const encodingJson = JSON.stringify(result.encoding);
    const existing = db.prepare('SELECT id FROM face_encodings WHERE user_id=?').get(req.user.id);
    if (existing) {
      db.prepare('UPDATE face_encodings SET encoding=?, selfie_filename=?, updated_at=CURRENT_TIMESTAMP WHERE user_id=?')
        .run(encodingJson, req.file.filename, req.user.id);
    } else {
      db.prepare('INSERT INTO face_encodings (id, user_id, encoding, selfie_filename) VALUES (?,?,?,?)')
        .run(uuidv4(), req.user.id, encodingJson, req.file.filename);
    }

    res.json({
      success: true,
      message: 'Face registered successfully!',
      face_count: result.face_count,
      selfie_filename: req.file.filename
    });
  } catch (err) {
    console.error('Selfie upload error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/face/my-selfie
 * Check if user has a registered face
 */
router.get('/my-selfie', authMiddleware, (req, res) => {
  const row = db.prepare('SELECT selfie_filename, updated_at FROM face_encodings WHERE user_id=?').get(req.user.id);
  if (!row) return res.json({ registered: false });
  res.json({ registered: true, selfie_filename: row.selfie_filename, updated_at: row.updated_at });
});

/**
 * POST /api/face/find-my-photos
 * Scan all event photos and return ones containing the user's face
 * Optional: filter by event_id
 */
router.post('/find-my-photos', authMiddleware, async (req, res) => {
  try {
    const { event_id } = req.body;

    // Get user's stored encoding
    const encodingRow = db.prepare('SELECT encoding FROM face_encodings WHERE user_id=?').get(req.user.id);
    if (!encodingRow) {
      return res.status(400).json({ error: 'No face registered. Please upload a selfie first.' });
    }

    const selfieEncoding = JSON.parse(encodingRow.encoding);

    // Get candidate photos (images only, not videos)
    let mediaQuery = `SELECT m.id, m.filename, m.event_id, m.caption, m.tags, m.created_at,
      e.name as event_name, u.username as uploader_name
      FROM media m
      LEFT JOIN events e ON m.event_id = e.id
      LEFT JOIN users u ON m.uploader_id = u.id
      WHERE m.file_type = 'photo'`;

    const params = [];
    if (event_id) {
      mediaQuery += ' AND m.event_id = ?';
      params.push(event_id);
    }

    const mediaRows = db.prepare(mediaQuery).all(...params);

    if (mediaRows.length === 0) {
      return res.json({ matches: [], total: 0, scanned: 0 });
    }

    // Build file paths for existing files
    const imagePaths = [];
    const pathToMedia = {};
    for (const m of mediaRows) {
      const fp = path.join(MEDIA_DIR, m.filename);
      if (fs.existsSync(fp)) {
        imagePaths.push(fp);
        pathToMedia[fp] = m;
      }
    }

    if (imagePaths.length === 0) {
      return res.json({ matches: [], total: 0, scanned: 0 });
    }

    // Run face matching (batch all images in one call)
    const faceResult = await runFaceService(
      ['find_matches', JSON.stringify(selfieEncoding), ...imagePaths],
      120000 // 2 minute timeout for large batches
    );

    // Build response with full media info
    const matches = (faceResult.matches || []).map(match => {
      const mediaInfo = pathToMedia[match.path];
      return {
        ...mediaInfo,
        tags: (() => { try { return JSON.parse(mediaInfo.tags || '[]'); } catch { return []; } })(),
        face_confidence: match.confidence,
        confidence_label: match.confidence > 0.7 ? 'High' : match.confidence > 0.5 ? 'Medium' : 'Low',
        like_count: db.prepare('SELECT COUNT(*) as c FROM likes WHERE media_id=?').get(mediaInfo.id)?.c || 0,
        liked: !!db.prepare('SELECT id FROM likes WHERE media_id=? AND user_id=?').get(mediaInfo.id, req.user.id),
        favourited: !!db.prepare('SELECT id FROM favourites WHERE media_id=? AND user_id=?').get(mediaInfo.id, req.user.id),
      };
    });

    res.json({
      matches,
      total: matches.length,
      scanned: imagePaths.length
    });
  } catch (err) {
    console.error('Face find error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/face/selfie-image/:filename
 * Serve selfie images
 */
router.get('/selfie-image/:filename', authMiddleware, (req, res) => {
  const fp = path.join(SELFIE_DIR, req.params.filename);
  if (!fs.existsSync(fp)) return res.status(404).json({ error: 'Not found' });
  res.sendFile(fp);
});

/**
 * DELETE /api/face/my-selfie
 * Remove registered face
 */
router.delete('/my-selfie', authMiddleware, (req, res) => {
  try {
    const row = db.prepare('SELECT selfie_filename FROM face_encodings WHERE user_id=?').get(req.user.id);
    if (row?.selfie_filename) {
      const fp = path.join(SELFIE_DIR, row.selfie_filename);
      if (fs.existsSync(fp)) fs.unlinkSync(fp);
    }
    db.prepare('DELETE FROM face_encodings WHERE user_id=?').run(req.user.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
