import type { Request, Response } from 'express';
import mongoose from 'mongoose';

const DB_STATES: Record<number, string> = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting',
  99: 'uninitialized',
};

/**
 * Returns server and database connection health status.
 */
export function getHealthStatus(_req: Request, res: Response): void {
  const readyState = mongoose.connection.readyState;

  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    database: DB_STATES[readyState] ?? 'unknown',
    timestamp: new Date().toISOString(),
  });
}
