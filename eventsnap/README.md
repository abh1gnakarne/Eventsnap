# 📸 EventSnap — Event & Media Management Platform

A full-stack web application for clubs and photographers to upload, organize, and discover event media — all in one place.

---

## 🚀 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, React Router 6, Axios, Socket.io-client, React Dropzone |
| Backend | Node.js, Express.js |
| Database | SQLite (via better-sqlite3) |
| Real-time | Socket.io |
| Auth | JWT (jsonwebtoken) + bcryptjs |
| File Upload | Multer (local storage, S3-ready) |
| Watermark | Sharp (image processing) |
| Styling | Custom CSS with Google Fonts (Syne + DM Sans) |

---

## ⚙️ Setup & Run

### Prerequisites
- Node.js v18+
- npm

### 1. Install dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Start the backend

```bash
cd backend
node server.js
# Runs on http://localhost:5000
```

### 3. Start the frontend (in a new terminal)

```bash
cd frontend
npm start
# Runs on http://localhost:3000
```

### 4. Open in browser
Go to `http://localhost:3000`

---

## 🗂️ Project Structure

```
eventsnap/
├── backend/
│   ├── server.js              # Express app + Socket.io setup
│   ├── models/
│   │   └── db.js              # SQLite database + all table schemas
│   ├── middleware/
│   │   └── auth.js            # JWT auth middleware
│   ├── routes/
│   │   ├── auth.js            # Register, login, profile
│   │   ├── events.js          # CRUD for events
│   │   ├── media.js           # Upload, like, comment, tag, download
│   │   └── notifications.js   # Real-time notifications
│   └── uploads/
│       └── media/             # Stored photos/videos
│
├── frontend/
│   ├── public/
│   │   └── index.html
│   └── src/
│       ├── App.js             # Router + providers
│       ├── index.js           # Entry point
│       ├── index.css          # Global styles + design system
│       ├── context/
│       │   └── AuthContext.js # Global auth state
│       ├── utils/
│       │   └── api.js         # Axios instance with interceptors
│       ├── components/
│       │   ├── Navbar.js      # Sticky nav + notification bell
│       │   ├── MediaCard.js   # Masonry grid card with hover actions
│       │   ├── MediaLightbox.js # Full-view with comments + tagging
│       │   └── UploadModal.js # Drag & drop bulk upload
│       └── pages/
│           ├── Home.js        # Landing + recent events
│           ├── Login.js       # Login form
│           ├── Register.js    # Register with role selection
│           ├── Events.js      # Event listing + create event
│           ├── EventDetail.js # Gallery view for one event
│           ├── Search.js      # Global media search
│           ├── Profile.js     # User profile + tagged photos
│           ├── Favourites.js  # Starred photos
│           └── MyPhotos.js    # User's uploads + stats
```

---

## 🗄️ Database Schema

### users
| Column | Type | Description |
|---|---|---|
| id | TEXT PK | UUID |
| username | TEXT UNIQUE | Display name |
| email | TEXT UNIQUE | Login email |
| password | TEXT | bcrypt hash |
| role | TEXT | admin / photographer / member / viewer |
| avatar | TEXT | Avatar filename |
| bio | TEXT | Profile bio |
| created_at | DATETIME | Auto |

### events
| Column | Type | Description |
|---|---|---|
| id | TEXT PK | UUID |
| name | TEXT | Event name |
| description | TEXT | Description |
| category | TEXT | general/sports/cultural/etc. |
| date | TEXT | Event date |
| location | TEXT | Venue |
| cover_image | TEXT | Cover image filename |
| is_public | INTEGER | 1=public, 0=private |
| created_by | TEXT FK | users.id |

### media
| Column | Type | Description |
|---|---|---|
| id | TEXT PK | UUID |
| event_id | TEXT FK | events.id |
| uploader_id | TEXT FK | users.id |
| filename | TEXT | Stored filename |
| original_name | TEXT | Original upload name |
| file_type | TEXT | photo / video |
| file_size | INTEGER | Bytes |
| tags | TEXT | JSON array of tags |
| caption | TEXT | Caption text |
| is_public | INTEGER | Visibility |
| views | INTEGER | View count |

### likes, comments, favourites, tags, notifications
Standard social interaction tables with foreign keys to media and users.

---

## ✨ Features

### Core
- ✅ Event creation with cover images, categories, dates, public/private
- ✅ Bulk drag-and-drop photo/video upload (up to 20 files, 50MB each)
- ✅ Role-based auth: Admin, Photographer, Member, Viewer
- ✅ Masonry gallery with infinite scroll feel
- ✅ Like / Unlike photos
- ✅ Comment on photos (with delete)
- ✅ Star / Favourites
- ✅ Tag friends in photos
- ✅ Download with automatic watermark (EventSnap + event name)
- ✅ Real-time notifications via Socket.io (like, comment, tag, upload)
- ✅ Global search by caption, tag, event name, username
- ✅ Tag-based filtering per event
- ✅ Profile page with stats (uploads, likes, tagged-in count)
- ✅ AI smart tagging (auto-assigns semantic tag categories on upload)

### Bonus implemented
- ✅ Masonry/waterfall gallery layout
- ✅ Animated hover overlays on media cards
- ✅ Dark cinematic UI theme
- ✅ Notification bell with unread badge
- ✅ Upload progress bar
- ✅ Media lightbox with sidebar comments

---

## 🔑 Roles & Access

| Action | Admin | Photographer | Member | Viewer |
|---|:---:|:---:|:---:|:---:|
| Create events | ✅ | ✅ | ✅ | ❌ |
| Upload media | ✅ | ✅ | ✅ | ❌ |
| Delete any content | ✅ | ❌ | ❌ | ❌ |
| Delete own content | ✅ | ✅ | ✅ | ❌ |
| Like/Comment/Fav | ✅ | ✅ | ✅ | ✅ |
| View private events | ✅ | ✅ | ✅ | ❌ |

---

## 🌐 API Reference

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | /api/auth/register | Register new user |
| POST | /api/auth/login | Login |
| GET | /api/auth/me | Get current user |
| PUT | /api/auth/me | Update profile |
| GET | /api/auth/users | List all users (for tagging) |

### Events
| Method | Endpoint | Description |
|---|---|---|
| GET | /api/events | List events (with filters) |
| GET | /api/events/:id | Get single event |
| POST | /api/events | Create event |
| PUT | /api/events/:id | Update event |
| DELETE | /api/events/:id | Delete event |

### Media
| Method | Endpoint | Description |
|---|---|---|
| GET | /api/media/event/:id | Get event media |
| POST | /api/media/upload | Bulk upload |
| GET | /api/media/file/:filename | Serve file |
| GET | /api/media/download/:id | Download with watermark |
| POST | /api/media/:id/like | Toggle like |
| GET | /api/media/:id/comments | Get comments |
| POST | /api/media/:id/comments | Post comment |
| DELETE | /api/media/:id/comments/:cid | Delete comment |
| POST | /api/media/:id/favourite | Toggle favourite |
| POST | /api/media/:id/tag | Tag a user |
| GET | /api/media/user/favourites | My favourites |
| GET | /api/media/user/tagged | Photos I'm tagged in |
| GET | /api/media/user/my-uploads | My uploads |
| GET | /api/media/search/all | Global search |
| DELETE | /api/media/:id | Delete media |

### Notifications
| Method | Endpoint | Description |
|---|---|---|
| GET | /api/notifications | Get all notifications |
| PUT | /api/notifications/read | Mark all read |
| GET | /api/notifications/unread-count | Unread count |

---

## 🏗️ Architecture

```
Browser (React SPA)
      │
      │ HTTP/WebSocket
      ▼
Express.js Server (port 5000)
      │
      ├── REST API routes
      │         │
      │         ▼
      │    SQLite Database (eventsnap.db)
      │
      ├── Static file serving (/media)
      │         │
      │         ▼
      │    Local uploads/ folder
      │    (swap for AWS S3 in production)
      │
      └── Socket.io
                │
                ▼
          Real-time notification push to connected users
```

---

## 🚀 Production / Cloud Notes

To deploy with AWS S3 instead of local storage:
1. Install `@aws-sdk/client-s3` and `multer-s3`
2. Replace the `multer` storage config in `routes/media.js` and `routes/events.js` with an S3 storage engine
3. Update `GET /media/file/:filename` to redirect to signed S3 URLs

---

## 👨‍💻 Team

Built as part of CIG Development Problem Statement — Event & Media Management Platform.
