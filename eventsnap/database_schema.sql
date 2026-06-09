-- EventSnap Database Schema
-- SQLite (sql.js) — swap connection string for PostgreSQL/MySQL in production

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,               -- UUID
  username TEXT UNIQUE NOT NULL,     -- Display name
  email TEXT UNIQUE NOT NULL,        -- Login email
  password TEXT NOT NULL,            -- bcrypt hash
  role TEXT DEFAULT 'viewer'         -- admin | photographer | member | viewer
    CHECK(role IN ('admin','photographer','member','viewer')),
  avatar TEXT,                       -- Avatar filename
  bio TEXT,                          -- Profile bio
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Events table
CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,               -- UUID
  name TEXT NOT NULL,                -- Event title
  description TEXT,                  -- Long description
  category TEXT DEFAULT 'general',   -- general | sports | cultural | workshop | trip | party | etc.
  date TEXT,                         -- Event date (YYYY-MM-DD)
  location TEXT,                     -- Venue / location string
  cover_image TEXT,                  -- Cover image filename in uploads/media/
  is_public INTEGER DEFAULT 1,       -- 1=public, 0=private
  created_by TEXT REFERENCES users(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Media table (photos and videos)
CREATE TABLE IF NOT EXISTS media (
  id TEXT PRIMARY KEY,               -- UUID
  event_id TEXT REFERENCES events(id) ON DELETE CASCADE,
  uploader_id TEXT REFERENCES users(id),
  filename TEXT NOT NULL,            -- Stored filename (UUID-based)
  original_name TEXT,                -- Original upload filename
  file_type TEXT DEFAULT 'photo'     -- photo | video
    CHECK(file_type IN ('photo','video')),
  file_size INTEGER,                 -- File size in bytes
  tags TEXT DEFAULT '[]',            -- JSON array of tags (AI-generated + user)
  caption TEXT,                      -- User-provided caption
  is_public INTEGER DEFAULT 1,       -- Visibility
  views INTEGER DEFAULT 0,           -- View count
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Likes table
CREATE TABLE IF NOT EXISTS likes (
  id TEXT PRIMARY KEY,
  media_id TEXT REFERENCES media(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(media_id, user_id)          -- One like per user per photo
);

-- Comments table
CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  media_id TEXT REFERENCES media(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id),
  content TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Favourites / Saved photos
CREATE TABLE IF NOT EXISTS favourites (
  id TEXT PRIMARY KEY,
  media_id TEXT REFERENCES media(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(media_id, user_id)
);

-- Photo tagging (tag a person in a photo)
CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY,
  media_id TEXT REFERENCES media(id) ON DELETE CASCADE,
  tagged_user_id TEXT REFERENCES users(id),
  tagged_by TEXT REFERENCES users(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),         -- Recipient
  type TEXT NOT NULL,                         -- like | comment | tag | upload
  message TEXT NOT NULL,                      -- Human-readable message
  related_media_id TEXT,                      -- Which photo
  related_user_id TEXT,                       -- Who triggered it
  is_read INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Event members (for private event access)
CREATE TABLE IF NOT EXISTS event_members (
  event_id TEXT REFERENCES events(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id),
  PRIMARY KEY(event_id, user_id)
);

-- Useful indexes for performance
CREATE INDEX IF NOT EXISTS idx_media_event ON media(event_id);
CREATE INDEX IF NOT EXISTS idx_media_uploader ON media(uploader_id);
CREATE INDEX IF NOT EXISTS idx_likes_media ON likes(media_id);
CREATE INDEX IF NOT EXISTS idx_comments_media ON comments(media_id);
CREATE INDEX IF NOT EXISTS idx_notifs_user ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_tags_user ON tags(tagged_user_id);
