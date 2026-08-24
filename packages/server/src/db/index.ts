import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = process.env.DATABASE_URL || path.join(__dirname, '../../notely.db');

export const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS notes (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT '',
    content TEXT NOT NULL DEFAULT '',
    pinned INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER
  );

  CREATE TABLE IF NOT EXISTS tags (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    UNIQUE(user_id, name)
  );

  CREATE TABLE IF NOT EXISTS note_tags (
    note_id TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (note_id, tag_id)
  );

  CREATE TABLE IF NOT EXISTS sync_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    operation TEXT NOT NULL,
    payload TEXT NOT NULL,
    version INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_notes_user_updated ON notes(user_id, updated_at DESC);
  CREATE INDEX IF NOT EXISTS idx_notes_user_pinned ON notes(user_id, pinned DESC, updated_at DESC);
  CREATE INDEX IF NOT EXISTS idx_notes_user_deleted ON notes(user_id, deleted_at);
  CREATE INDEX IF NOT EXISTS idx_tags_user ON tags(user_id, name);
  CREATE INDEX IF NOT EXISTS idx_note_tags_note ON note_tags(note_id);
  CREATE INDEX IF NOT EXISTS idx_note_tags_tag ON note_tags(tag_id);
  CREATE INDEX IF NOT EXISTS idx_sync_log_user_version ON sync_log(user_id, version);
  CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
  CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token_hash);
`);

export const stmts = {
  createUser: db.prepare(`
    INSERT INTO users (id, email, password_hash, created_at, updated_at)
    VALUES (@id, @email, @password_hash, @created_at, @updated_at)
  `),
  getUserByEmail: db.prepare('SELECT * FROM users WHERE email = ?'),
  getUserById: db.prepare('SELECT * FROM users WHERE id = ?'),

  createSession: db.prepare(`
    INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at, updated_at)
    VALUES (@id, @user_id, @token_hash, @expires_at, @created_at, @updated_at)
  `),
  getSessionByToken: db.prepare('SELECT * FROM sessions WHERE token_hash = ?'),
  deleteSession: db.prepare('DELETE FROM sessions WHERE id = ?'),
  deleteUserSessions: db.prepare('DELETE FROM sessions WHERE user_id = ?'),

  listNotes: db.prepare(`
    SELECT * FROM notes
    WHERE user_id = ? AND deleted_at IS NULL
    ORDER BY pinned DESC, updated_at DESC
  `),
  getNote: db.prepare('SELECT * FROM notes WHERE id = ? AND user_id = ?'),
  createNote: db.prepare(`
    INSERT INTO notes (id, user_id, title, content, pinned, created_at, updated_at)
    VALUES (@id, @user_id, @title, @content, @pinned, @created_at, @updated_at)
  `),
  updateNote: db.prepare(`
    UPDATE notes
    SET title = @title, content = @content, pinned = @pinned, updated_at = @updated_at
    WHERE id = @id AND user_id = @user_id
  `),
  deleteNote: db.prepare('UPDATE notes SET deleted_at = ? WHERE id = ? AND user_id = ?'),
  hardDeleteNote: db.prepare('DELETE FROM notes WHERE id = ? AND user_id = ?'),

  listTags: db.prepare('SELECT * FROM tags WHERE user_id = ? ORDER BY name'),
  getTag: db.prepare('SELECT * FROM tags WHERE id = ? AND user_id = ?'),
  getTagByName: db.prepare('SELECT * FROM tags WHERE user_id = ? AND name = ?'),
  createTag: db.prepare(`
    INSERT INTO tags (id, user_id, name, created_at)
    VALUES (@id, @user_id, @name, @created_at)
  `),
  deleteTag: db.prepare('DELETE FROM tags WHERE id = ? AND user_id = ?'),

  addNoteTag: db.prepare('INSERT OR IGNORE INTO note_tags (note_id, tag_id) VALUES (?, ?)'),
  removeNoteTag: db.prepare('DELETE FROM note_tags WHERE note_id = ? AND tag_id = ?'),
  getNoteTags: db.prepare(`
    SELECT t.* FROM tags t
    INNER JOIN note_tags nt ON t.id = nt.tag_id
    WHERE nt.note_id = ?
  `),
  getTagNotes: db.prepare(`
    SELECT n.* FROM notes n
    INNER JOIN note_tags nt ON n.id = nt.note_id
    WHERE nt.tag_id = ? AND n.user_id = ? AND n.deleted_at IS NULL
  `),

  getSyncVersion: db.prepare('SELECT MAX(version) as version FROM sync_log WHERE user_id = ?'),
  getSyncChanges: db.prepare(`
    SELECT * FROM sync_log
    WHERE user_id = ? AND version > ?
    ORDER BY version ASC
  `),
  logSync: db.prepare(`
    INSERT INTO sync_log (user_id, entity_type, entity_id, operation, payload, version, created_at)
    VALUES (@user_id, @entity_type, @entity_id, @operation, @payload, @version, @created_at)
  `),
};

export function rowToNote(row: any) {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    content: row.content,
    pinned: !!row.pinned,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

export function rowToTag(row: any) {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    createdAt: row.created_at,
  };
}

export function rowToUser(row: any) {
  return {
    id: row.id,
    email: row.email,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function seedWelcomeNote(userId: string) {
  const now = Date.now();
  const noteId = crypto.randomUUID();
  const tagId = crypto.randomUUID();

  const transaction = db.transaction(() => {
    stmts.createTag.run({
      id: tagId,
      user_id: userId,
      name: 'guide',
      created_at: now,
    });

    stmts.createNote.run({
      id: noteId,
      user_id: userId,
      title: 'Welcome to Notely \ud83d\udc4b',
      content: `# Getting started

This is your first note. Everything is saved automatically on the server in a SQLite database.

## Things you can do

- Create, edit, pin and delete notes
- Organize with **tags** and filter by them
- Search across titles, content and tags
- Toggle *Markdown preview* with the eye button
- Export everything as JSON for backup

Try some \`inline code\` or a [link](https://example.com).`,
      pinned: 1,
      created_at: now,
      updated_at: now,
    });

    stmts.addNoteTag.run(noteId, tagId);

    const version = (stmts.getSyncVersion.get(userId) as any)?.version || 0;
    stmts.logSync.run({
      user_id: userId,
      entity_type: 'note',
      entity_id: noteId,
      operation: 'create',
      payload: JSON.stringify({ title: 'Welcome to Notely \ud83d\udc4b' }),
      version: version + 1,
      created_at: now,
    });
  });

  transaction();
}

console.log('\u2705 Database initialized');
