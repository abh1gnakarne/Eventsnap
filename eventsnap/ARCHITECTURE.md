# EventSnap — Architecture Document

## System Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                        CLIENT BROWSER                            │
│                                                                  │
│  React SPA (port 3000 in dev / served by Express in prod)        │
│  ┌─────────┐ ┌──────────┐ ┌────────────┐ ┌──────────────────┐  │
│  │ Pages   │ │Components│ │AuthContext │ │ Socket.io Client │  │
│  │ Home    │ │ Navbar   │ │ (JWT store)│ │ (notifications)  │  │
│  │ Events  │ │MediaCard │ └────────────┘ └──────────────────┘  │
│  │ Detail  │ │Lightbox  │                                       │
│  │ Profile │ │UploadMdl │  Axios (with JWT interceptor)         │
│  └─────────┘ └──────────┘          │                            │
└────────────────────────────────────┼────────────────────────────┘
                                     │ HTTP / WebSocket
                                     ▼
┌──────────────────────────────────────────────────────────────────┐
│                    EXPRESS.JS SERVER (port 5000)                  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                     MIDDLEWARE LAYER                      │   │
│  │  cors() │ express.json() │ JWT authMiddleware             │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─────────────┐ ┌──────────────┐ ┌──────────────┐             │
│  │  /api/auth  │ │ /api/events  │ │  /api/media  │             │
│  │  register   │ │  list        │ │  upload(bulk)│             │
│  │  login      │ │  create      │ │  like/comment│             │
│  │  me         │ │  update      │ │  tag/fav     │             │
│  │  users      │ │  delete      │ │  download+wm │             │
│  └─────────────┘ └──────────────┘ └──────────────┘             │
│                                                                  │
│  ┌──────────────────────┐   ┌──────────────────────────────┐   │
│  │ /api/notifications   │   │      Socket.io Server        │   │
│  │  list / mark read    │   │  Room: user_{id}             │   │
│  └──────────────────────┘   │  Events: 'notifications'     │   │
│                              └──────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────┐   ┌──────────────────────────────┐   │
│  │   sql.js (SQLite)    │   │  Multer + Sharp               │   │
│  │   eventsnap.db       │   │  File upload + watermark      │   │
│  └──────────────────────┘   └──────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
                      │                      │
          ┌───────────┘                      └────────────┐
          ▼                                               ▼
┌──────────────────────┐              ┌─────────────────────────┐
│    SQLite Database   │              │   Local File Storage     │
│    (eventsnap.db)    │              │   uploads/media/         │
│                      │              │   (→ swap for AWS S3)    │
│  users               │              │                          │
│  events              │              │  Photos, Videos          │
│  media               │              │  Cover images            │
│  likes               │              │                          │
│  comments            │              └─────────────────────────┘
│  favourites          │
│  tags                │
│  notifications       │
│  event_members       │
└──────────────────────┘
```

---

## Request Flow Examples

### 1. User Uploads Photos

```
Browser → POST /api/media/upload (multipart/form-data)
       → Multer saves files to uploads/media/ with UUID filenames
       → AI auto-tags assigned (simulated tag categories)
       → User tags merged with auto-tags
       → Media rows inserted into SQLite
       → Notification sent to event members
       → Socket.io broadcasts to connected users
       → Response: { uploaded: N, media: [...] }
```

### 2. Real-time Notification

```
User A likes User B's photo
→ POST /api/media/:id/like
→ Like row inserted in DB
→ Notification row inserted: { user_id: B, type:'like', message:'A liked your photo' }
→ Socket.io interval (5s) picks up unread notification
→ io.to('user_B').emit('notifications', [...])
→ User B's bell badge updates in real time
```

### 3. Download with Watermark

```
Browser → GET /api/media/download/:id
       → Server fetches file path
       → Sharp composites SVG watermark onto image
          "📸 EventSnap | {EventName}"
       → Returns JPEG buffer with Content-Disposition: attachment
       → Browser triggers download
```

### 4. Auth Flow

```
Register/Login → bcrypt.hash(password) → JWT signed with secret
              → Token stored in localStorage
              → Axios interceptor adds Authorization: Bearer {token}
              → authMiddleware verifies token on protected routes
              → req.user = { id, username, role, ... }
```

---

## AI/ML Feature: Smart Image Tagging

Since full ML inference (TensorFlow/YOLO) requires GPU and heavy model files,
we implement **simulated smart tagging** that mimics a real ML pipeline:

- On upload, each photo gets assigned a random semantic tag cluster:
  - `outdoor, nature, landscape`
  - `people, group, portrait`
  - `event, celebration, party`
  - `sports, action, competition`
  - `art, creative, design`
  - `campus, college, students`
  - `music, performance, stage`
  - `food, dining, culture`

- Users can add their own custom tags
- Tags are stored as a JSON array and indexed for search
- The search engine queries against these tags

**To integrate real ML:**
1. Install `@tensorflow-models/mobilenet` or use AWS Rekognition
2. On upload, call `model.classify(imageBuffer)`
3. Map classification labels → tag categories
4. Store results in the `tags` column

---

## Cloud Migration Guide (Local → AWS S3)

```javascript
// Replace in routes/media.js and routes/events.js:

const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const multerS3 = require('multer-s3');

const s3 = new S3Client({ region: process.env.AWS_REGION });

const storage = multerS3({
  s3,
  bucket: process.env.S3_BUCKET,
  key: (req, file, cb) => cb(null, `media/${uuidv4()}${path.extname(file.originalname)}`)
});

// File URL becomes: https://bucket.s3.region.amazonaws.com/media/uuid.jpg
```

---

## Security Design

| Feature | Implementation |
|---|---|
| Password hashing | bcryptjs (10 rounds) |
| Auth tokens | JWT HS256, 7-day expiry |
| Route protection | authMiddleware on all write endpoints |
| Role-based access | Checked in each route handler |
| Private events | Filtered server-side, not just UI |
| File safety | Multer limits: 50MB max, type checking |
| SQL injection | Parameterized queries via sql.js |

---

## Scalability Notes

- **Database**: SQLite → PostgreSQL for multi-process production
- **Storage**: Local disk → AWS S3 / Cloudflare R2
- **Sessions**: Single-node JWT → Redis for distributed token blacklisting  
- **Real-time**: Single Socket.io → Socket.io with Redis adapter
- **Media processing**: Synchronous Sharp → SQS queue + Lambda workers
