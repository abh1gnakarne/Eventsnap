const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '../eventsnap.db');

// Synchronous-style wrapper around sql.js
let _db = null;

function getDb() { return _db; }

async function initDb() {
  const SQL = await initSqlJs();
  
  // Load existing DB file if it exists
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    _db = new SQL.Database(fileBuffer);
  } else {
    _db = new SQL.Database();
  }

  // Save to disk helper
  _db.saveToFile = () => {
    const data = _db.export();
    fs.writeFileSync(DB_PATH, Buffer.from(data));
  };

  // Create tables
  _db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'viewer',
      avatar TEXT,
      bio TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      category TEXT DEFAULT 'general',
      date TEXT,
      location TEXT,
      cover_image TEXT,
      is_public INTEGER DEFAULT 1,
      created_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS media (
      id TEXT PRIMARY KEY,
      event_id TEXT,
      uploader_id TEXT,
      filename TEXT NOT NULL,
      original_name TEXT,
      file_type TEXT DEFAULT 'photo',
      file_size INTEGER,
      tags TEXT DEFAULT '[]',
      caption TEXT,
      is_public INTEGER DEFAULT 1,
      views INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS likes (
      id TEXT PRIMARY KEY,
      media_id TEXT,
      user_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      media_id TEXT,
      user_id TEXT,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS favourites (
      id TEXT PRIMARY KEY,
      media_id TEXT,
      user_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY,
      media_id TEXT,
      tagged_user_id TEXT,
      tagged_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      type TEXT NOT NULL,
      message TEXT NOT NULL,
      related_media_id TEXT,
      related_user_id TEXT,
      is_read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS event_members (
      event_id TEXT,
      user_id TEXT,
      PRIMARY KEY(event_id, user_id)
    );
    CREATE TABLE IF NOT EXISTS face_encodings (
      id TEXT PRIMARY KEY,
      user_id TEXT UNIQUE,
      encoding TEXT NOT NULL,
      selfie_filename TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  _db.saveToFile();
  return _db;
}

// Wrap sql.js to look like better-sqlite3 (synchronous API)
function prepare(sql) {
  return {
    _sql: sql,
    run(...params) {
      const db = getDb();
      db.run(sql, params);
      db.saveToFile();
      return { changes: 1 };
    },
    get(...params) {
      const db = getDb();
      const stmt = db.prepare(sql);
      stmt.bind(params);
      if (stmt.step()) {
        const row = stmt.getAsObject();
        stmt.free();
        return row;
      }
      stmt.free();
      return undefined;
    },
    all(...params) {
      const db = getDb();
      const results = [];
      const stmt = db.prepare(sql);
      stmt.bind(params);
      while (stmt.step()) {
        results.push(stmt.getAsObject());
      }
      stmt.free();
      return results;
    }
  };
}

function exec(sql) {
  const db = getDb();
  db.run(sql);
  db.saveToFile();
}

module.exports = { initDb, prepare, exec, getDb };

// Face encodings table (added for facial recognition feature)
async function ensureFaceTable() {
  const db = getDb();
  if (db) {
    db.run(`CREATE TABLE IF NOT EXISTS face_encodings (
      id TEXT PRIMARY KEY,
      user_id TEXT UNIQUE,
      encoding TEXT NOT NULL,
      selfie_filename TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );`);
    db.saveToFile();
  }
}
module.exports.ensureFaceTable = ensureFaceTable;
