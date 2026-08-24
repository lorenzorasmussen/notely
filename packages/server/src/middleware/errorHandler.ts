import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  status: number;

  constructor(message: string, status: number = 500) {
    super(message);
    this.status = status;
    this.name = 'AppError';
  }
}

export function errorHandler(
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.error('Error:', err);

  if (err instanceof AppError) {
    res.status(err.status).json({
      error: err.message,
      status: err.status,
    });
    return;
  }

  if (err.name === 'ZodError') {
    res.status(400).json({
      error: 'Validation error',
      details: (err as any).errors,
    });
    return;
  }

  if (err.message.includes('SQLITE') || err.message.includes('database')) {
    res.status(500).json({
      error: 'Database error',
      status: 500,
    });
    return;
  }

  res.status(500).json({
    error: 'Internal server error',
    status: 500,
  });
}
