# Notely - Setup Guide

## Requirements

- Node.js 20+
- npm

## Quick Start

```bash
git clone https://github.com/lorenzorasmussen/notely.git
cd notely
npm install
npm run dev
```

Open http://localhost:5173

## Development Workflow

```bash
npm run dev          # Both server and frontend with hot reload
npm run dev:server   # Backend only (http://localhost:3000)
npm run dev:web      # Frontend only (http://localhost:5173, Vite HMR)
```

## Production Build

```bash
npm run build   # Builds the frontend into packages/web/dist
npm start       # Serves the built frontend + API from Express
```

## Docker

```bash
docker-compose up --build
```

The app is served on http://localhost:3000, with the SQLite database persisted in a named Docker volume.

## Environment Configuration

Create a `.env` file in the project root (see `.env.example`):

```bash
PORT=3000
DATABASE_URL=./notely.db
JWT_SECRET=your-super-secret-key-change-this-in-production
CORS_ORIGIN=http://localhost:5173
NODE_ENV=development
```

**Important:** Always change `JWT_SECRET` before deploying to production. Generate one with:

```bash
openssl rand -base64 32
```

## Testing

```bash
npm test                              # All tests
npm run test --workspace=@notely/server
npm run test --workspace=@notely/web
```

## Troubleshooting

**Port already in use:**
```bash
PORT=3001 npm run dev:server
```

**Database issues:**
```bash
rm packages/server/notely.db*
npm run dev:server  # recreates and seeds on startup
```

**Fresh install:**
```bash
rm -rf node_modules packages/*/node_modules packages/*/dist
npm install
```

## First Steps After Setup

1. Register an account at `/register`
2. You'll get a seeded "Welcome to Notely" note automatically
3. Create notes, add tags, try Markdown formatting
4. Toggle dark mode in the header
5. Export a backup via the notes store's exportNotes action
