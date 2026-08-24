import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

import { db, stmts, rowToUser, seedWelcomeNote } from '../db/index.js';
import { authMiddleware } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';
const TOKEN_EXPIRY = '30d';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

router.post('/register', async (req, res, next) => {
  try {
    const { email, password } = registerSchema.parse(req.body);

    const existing = stmts.getUserByEmail.get(email);
    if (existing) {
      throw new AppError('Email already registered', 409);
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const now = Date.now();
    const userId = uuidv4();

    stmts.createUser.run({
      id: userId,
      email,
      password_hash: passwordHash,
      created_at: now,
      updated_at: now,
    });

    seedWelcomeNote(userId);

    const token = jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });

    res.status(201).json({
      user: { id: userId, email },
      token,
    });
  } catch (error) {
    next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user: any = stmts.getUserByEmail.get(email);
    if (!user) {
      throw new AppError('Invalid email or password', 401);
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      throw new AppError('Invalid email or password', 401);
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: TOKEN_EXPIRY }
    );

    res.json({
      user: rowToUser(user),
      token,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/me', authMiddleware, (req, res, next) => {
  try {
    const user: any = stmts.getUserById.get(req.user!.userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    res.json({ user: rowToUser(user) });
  } catch (error) {
    next(error);
  }
});

router.post('/logout', authMiddleware, (req, res, next) => {
  try {
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

export { router as authRouter };
