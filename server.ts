/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express, { Request, Response, NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initializeDatabase, db } from './server/db.ts';
import { authRouter } from './server/routes/auth.ts';
import { eventsRouter } from './server/routes/events.ts';
import { reservationsRouter } from './server/routes/reservations.ts';
import { paymentsRouter } from './server/routes/payments.ts';
import { ordersRouter } from './server/routes/orders.ts';
import { ticketsRouter } from './server/routes/tickets.ts';
import { organizerRouter } from './server/routes/organizer.ts';
import { adminRouter } from './server/routes/admin.ts';
import { cache } from './server/cache.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

// Initialize DB schema and seed data
initializeDatabase();

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Request correlation ID and structured logger
app.use((req: Request, res: Response, next: NextFunction) => {
  const reqId = (req.headers['x-request-id'] as string) || `req_${crypto.randomBytes(6).toString('hex')}`;
  res.setHeader('X-Request-Id', reqId);
  (req as any).id = reqId;
  next();
});

// Health check endpoint
app.get('/api/health', (_req, res) => {
  try {
    const dbCheck = db.prepare('SELECT 1 as healthy').get() as { healthy: number };
    const cacheStats = cache.getStats();

    res.json({
      status: 'UP',
      timestamp: new Date().toISOString(),
      database: dbCheck?.healthy === 1 ? 'CONNECTED' : 'DEGRADED',
      cache: cacheStats,
      service: 'Eventora Enterprise Engine',
    });
  } catch (err: any) {
    res.status(503).json({ status: 'DOWN', error: err.message });
  }
});

// Mount Versioned REST API routes
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/events', eventsRouter);
app.use('/api/v1/reservations', reservationsRouter);
app.use('/api/v1/payments', paymentsRouter);
app.use('/api/v1/orders', ordersRouter);
app.use('/api/v1/tickets', ticketsRouter);
app.use('/api/v1/organizer', organizerRouter);
app.use('/api/v1/admin', adminRouter);

// Global Error Handler
app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
  console.error(`[API Error] Request ${(req as any).id}:`, err);
  const status = err.statusCode || 500;
  res.status(status).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_SERVER_ERROR',
      message: err.message || 'An unexpected server error occurred.',
    },
    requestId: (req as any).id,
  });
});

async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    // Serve static build in production
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  } else {
    // In development mode, mount Vite middlewares
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Eventora] Server running on http://localhost:${PORT}`);
    console.log(`[Eventora] API mounted at http://localhost:${PORT}/api/v1/`);
  });
}

startServer();
