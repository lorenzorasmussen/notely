# Notely - Full-Stack Note-Taking App

A production-ready, full-stack note-taking application with authentication, real-time sync, offline support, and a modern React frontend.

## Features

- User authentication (JWT + bcrypt)
- Full CRUD for notes with tags
- Full-text search across title and content
- Markdown editor with live preview
- Dark/light theme with persistence
- Export/import notes as JSON
- Responsive design (mobile-first)
- Auto-save with debouncing
- Sync API for multi-device support

## Architecture

```
notely/
├── packages/
│   ├── server/          # Express + SQLite backend
│   │   └── src/
│   │       ├── routes/  # API endpoints (auth, notes, sync)
│   │       ├── db/      # Database layer
│   │       └── middleware/
│   └── web/             # React + Vite frontend
│       └── src/
│           ├── components/
│           ├── pages/
│           └── store/   # Zustand state management
├── docker-compose.yml
└── Dockerfile
```

## Quick Start

```bash
npm install
npm run dev
```

- Backend: http://localhost:3000
- Frontend: http://localhost:5173

## Docker

```bash
docker-compose up --build
```

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Create account |
| POST | /api/auth/login | Login, get JWT |
| GET | /api/auth/me | Current user |
| GET | /api/notes | List notes (?q=, ?tag=) |
| POST | /api/notes | Create note |
| PUT | /api/notes/:id | Update note |
| DELETE | /api/notes/:id | Delete note |
| GET | /api/notes/tags | List tags |
| GET | /api/notes/export | Download JSON backup |
| POST | /api/notes/import | Import from JSON |
| GET | /api/sync | Incremental sync |
| POST | /api/sync/push | Push local changes |
| GET | /api/health | Health check |

See `API_REFERENCE.md` for complete documentation with request/response examples.

## Tech Stack

**Backend:** Node.js, Express, SQLite (better-sqlite3), JWT, bcrypt, Zod, TypeScript
**Frontend:** React 19, Vite, Zustand, React Router 7, marked, DOMPurify, TypeScript
**DevOps:** Docker, Docker Compose, npm workspaces

## Environment Variables

Copy `.env.example` to `.env`:

```bash
PORT=3000
DATABASE_URL=./notely.db
JWT_SECRET=your-secret-key
CORS_ORIGIN=http://localhost:5173
NODE_ENV=development
```

## License

MIT
