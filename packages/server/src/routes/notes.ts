import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

import { db, stmts, rowToNote, rowToTag } from '../db/index.js';
import { authMiddleware } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

router.use(authMiddleware);

const createNoteSchema = z.object({
  title: z.string().max(300).optional().default(''),
  content: z.string().optional().default(''),
  pinned: z.boolean().optional().default(false),
  tagIds: z.array(z.string().uuid()).optional().default([]),
});

const updateNoteSchema = z.object({
  title: z.string().max(300).optional(),
  content: z.string().optional(),
  pinned: z.boolean().optional(),
  tagIds: z.array(z.string().uuid()).optional(),
});

router.get('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const { q, tag } = req.query;

    let notes = db
      .prepare('SELECT * FROM notes WHERE user_id = ? AND deleted_at IS NULL ORDER BY pinned DESC, updated_at DESC')
      .all(userId)
      .map(rowToNote);

    if (tag) {
      const tagRow: any = stmts.getTagByName.get(userId, tag);
      if (tagRow) {
        const tagNotes = stmts.getTagNotes.all(tagRow.id, userId).map(rowToNote);
        notes = notes.filter(n => tagNotes.some(tn => tn.id === n.id));
      } else {
        notes = [];
      }
    }

    if (q && typeof q === 'string') {
      const needle = q.toLowerCase();
      notes = notes.filter(n =>
        n.title.toLowerCase().includes(needle) ||
        n.content.toLowerCase().includes(needle)
      );
    }

    const notesWithTags = notes.map(note => {
      const tags = stmts.getNoteTags.all(note.id).map(rowToTag);
      return { ...note, tags };
    });

    res.json(notesWithTags);
  } catch (error) {
    next(error);
  }
});

router.get('/tags', (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const tags = stmts.listTags.all(userId).map(rowToTag);
    res.json(tags);
  } catch (error) {
    next(error);
  }
});

router.get('/export', (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const notes = db
      .prepare('SELECT * FROM notes WHERE user_id = ? AND deleted_at IS NULL')
      .all(userId)
      .map(rowToNote);

    const notesWithTags = notes.map(note => {
      const tags = stmts.getNoteTags.all(note.id).map(rowToTag);
      return { ...note, tags: tags.map(t => t.name) };
    });

    const filename = `notely-backup-${new Date().toISOString().slice(0, 10)}.json`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.json(notesWithTags);
  } catch (error) {
    next(error);
  }
});

router.post('/import', (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const notes = z.array(z.any()).parse(req.body);

    const now = Date.now();
    let imported = 0;

    const transaction = db.transaction(() => {
      for (const item of notes) {
        if (!item || typeof item !== 'object') continue;

        const noteId = uuidv4();
        const title = String(item.title || '').slice(0, 300);
        const content = String(item.content || '');
        const pinned = item.pinned ? 1 : 0;
        const tagNames = Array.isArray(item.tags) ? item.tags.map((t: any) => String(t)) : [];

        stmts.createNote.run({
          id: noteId,
          user_id: userId,
          title,
          content,
          pinned,
          created_at: now,
          updated_at: now,
        });

        for (const tagName of tagNames) {
          let tag: any = stmts.getTagByName.get(userId, tagName);
          if (!tag) {
            const tagId = uuidv4();
            stmts.createTag.run({
              id: tagId,
              user_id: userId,
              name: tagName,
              created_at: now,
            });
            tag = { id: tagId };
          }
          stmts.addNoteTag.run(noteId, tag.id);
        }

        imported++;
      }
    });

    transaction();
    res.json({ imported });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const note: any = stmts.getNote.get(req.params.id, userId);

    if (!note) {
      throw new AppError('Note not found', 404);
    }

    const tags = stmts.getNoteTags.all(note.id).map(rowToTag);
    res.json({ ...rowToNote(note), tags });
  } catch (error) {
    next(error);
  }
});

router.post('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const { title, content, pinned, tagIds } = createNoteSchema.parse(req.body);

    const now = Date.now();
    const noteId = uuidv4();

    const transaction = db.transaction(() => {
      stmts.createNote.run({
        id: noteId,
        user_id: userId,
        title,
        content,
        pinned: pinned ? 1 : 0,
        created_at: now,
        updated_at: now,
      });

      for (const tagId of tagIds) {
        stmts.addNoteTag.run(noteId, tagId);
      }
    });

    transaction();

    const note: any = stmts.getNote.get(noteId, userId);
    const tags = stmts.getNoteTags.all(noteId).map(rowToTag);
    res.status(201).json({ ...rowToNote(note), tags });
  } catch (error) {
    next(error);
  }
});

router.put('/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const { title, content, pinned, tagIds } = updateNoteSchema.parse(req.body);

    const existing: any = stmts.getNote.get(req.params.id, userId);
    if (!existing) {
      throw new AppError('Note not found', 404);
    }

    const now = Date.now();

    const transaction = db.transaction(() => {
      stmts.updateNote.run({
        id: req.params.id,
        user_id: userId,
        title: title ?? existing.title,
        content: content ?? existing.content,
        pinned: pinned !== undefined ? (pinned ? 1 : 0) : existing.pinned,
        updated_at: now,
      });

      if (tagIds) {
        db.prepare('DELETE FROM note_tags WHERE note_id = ?').run(req.params.id);
        for (const tagId of tagIds) {
          stmts.addNoteTag.run(req.params.id, tagId);
        }
      }
    });

    transaction();

    const note: any = stmts.getNote.get(req.params.id, userId);
    const tags = stmts.getNoteTags.all(note.id).map(rowToTag);
    res.json({ ...rowToNote(note), tags });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const existing = stmts.getNote.get(req.params.id, userId);

    if (!existing) {
      throw new AppError('Note not found', 404);
    }

    stmts.deleteNote.run(Date.now(), req.params.id, userId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export { router as notesRouter };
