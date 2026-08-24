import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';

import { db, stmts, rowToNote } from '../db/index.js';
import { authMiddleware } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();
router.use(authMiddleware);

router.get('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const sinceVersion = parseInt(req.query.since_version as string) || 0;

    const currentVersion = (stmts.getSyncVersion.get(userId) as any)?.version || 0;
    const changes = stmts.getSyncChanges.all(userId, sinceVersion);

    res.json({
      version: currentVersion,
      changes: changes.map((c: any) => ({
        version: c.version,
        entityType: c.entity_type,
        entityId: c.entity_id,
        operation: c.operation,
        payload: JSON.parse(c.payload),
        createdAt: c.created_at,
      })),
    });
  } catch (error) {
    next(error);
  }
});

router.post('/push', (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const operations = z.array(z.object({
      entityType: z.enum(['note', 'tag']),
      entityId: z.string().uuid(),
      operation: z.enum(['create', 'update', 'delete']),
      payload: z.record(z.any()),
      clientVersion: z.number(),
    })).parse(req.body);

    const now = Date.now();
    let currentVersion = (stmts.getSyncVersion.get(userId) as any)?.version || 0;

    const transaction = db.transaction(() => {
      for (const op of operations) {
        currentVersion++;

        stmts.logSync.run({
          user_id: userId,
          entity_type: op.entityType,
          entity_id: op.entityId,
          operation: op.operation,
          payload: JSON.stringify(op.payload),
          version: currentVersion,
          created_at: now,
        });

        if (op.entityType === 'note') {
          if (op.operation === 'update') {
            const existing: any = stmts.getNote.get(op.entityId, userId);
            if (existing) {
              stmts.updateNote.run({
                id: op.entityId,
                user_id: userId,
                title: op.payload.title ?? existing.title,
                content: op.payload.content ?? existing.content,
                pinned: op.payload.pinned !== undefined ? (op.payload.pinned ? 1 : 0) : existing.pinned,
                updated_at: now,
              });
            }
          } else if (op.operation === 'delete') {
            stmts.deleteNote.run(now, op.entityId, userId);
          }
        }
      }
    });

    transaction();

    res.json({
      version: currentVersion,
      success: true,
    });
  } catch (error) {
    next(error);
  }
});

export { router as syncRouter };
