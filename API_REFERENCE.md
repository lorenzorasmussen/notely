# Notely API Reference

Base URL: `http://localhost:3000/api` (dev) or your deployed domain.

All endpoints except `/auth/register` and `/auth/login` require:

```
Authorization: Bearer <jwt-token>
```

## Auth

### POST /auth/register
Body: `{ "email": string, "password": string (min 8 chars) }`
Returns: `{ user, token }` (201). A welcome note is seeded automatically.

### POST /auth/login
Body: `{ "email": string, "password": string }`
Returns: `{ user, token }` (200) or 401 on bad credentials.

### GET /auth/me
Returns the authenticated user's profile.

### POST /auth/logout
Returns `{ ok: true }`.

## Notes

### GET /notes
Query params: `q` (search title/content), `tag` (filter by tag name).
Returns an array of notes sorted by pinned desc, updated_at desc, each including a `tags` array.

### GET /notes/:id
Returns a single note or 404.

### POST /notes
Body (all optional): `{ title, content, pinned, tagIds }`.
Returns the created note (201).

### PUT /notes/:id
Body (all optional, partial update): `{ title, content, pinned, tagIds }`.
Returns the updated note, or 404 if not found.

### DELETE /notes/:id
Soft-deletes (sets `deleted_at`). Returns 204.

### GET /notes/tags
Returns all tags for the authenticated user, sorted alphabetically.

### GET /notes/export
Downloads all notes as a JSON file (`Content-Disposition: attachment`).

### POST /notes/import
Body: array of note objects `{ title, content, pinned, tags: string[] }`.
Creates new notes, creating tags as needed. Returns `{ imported: number }`.

## Sync

### GET /sync?since_version=N
Returns `{ version, changes: [...] }` — all changes after version N, ascending order.

### POST /sync/push
Body: array of `{ entityType, entityId, operation, payload, clientVersion }`.
Applies operations in order, returns `{ version, success }`.

## Health

### GET /health
Returns `{ ok, timestamp, uptime }`. No auth required.

## Error Format

```json
{ "error": "message", "status": 400 }
```

Common codes: 400 (validation), 401 (auth), 404 (not found), 409 (conflict), 429 (rate limit), 500 (server error).

## Rate Limiting

100 requests per 15 minutes per IP across all `/api/*` routes.
