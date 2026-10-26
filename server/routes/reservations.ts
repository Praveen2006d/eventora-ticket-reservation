/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router } from 'express';
import { authenticateToken, AuthenticatedRequest } from '../auth.ts';
import { createReservation, getReservationSummary, releaseReservation } from '../reservationEngine.ts';

export const reservationsRouter = Router();

// POST /api/v1/reservations - Hold inventory for 10 minutes
reservationsRouter.post('/', authenticateToken, (req: AuthenticatedRequest, res) => {
  try {
    const { items } = req.body;
    const idempotencyKey = (req.headers['idempotency-key'] as string) || req.body.idempotencyKey;

    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Cart items array is required.' },
      });
      return;
    }

    const result = createReservation(req.user!.userId, items, idempotencyKey);

    res.status(201).json({
      success: true,
      data: result,
      message: 'Tickets held successfully for 10 minutes.',
    });
  } catch (err: any) {
    const statusCode = err.statusCode || (err.message?.includes('Insufficient inventory') ? 409 : 400);
    res.status(statusCode).json({
      success: false,
      error: {
        code: err.code || (statusCode === 409 ? 'INSUFFICIENT_INVENTORY' : 'RESERVATION_ERROR'),
        message: err.message,
      },
    });
  }
});

// GET /api/v1/reservations/:id - Check reservation details & expiration countdown
reservationsRouter.get('/:id', authenticateToken, (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const summary = getReservationSummary(id);
    res.json({ success: true, data: summary });
  } catch (err: any) {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: err.message },
    });
  }
});

// POST /api/v1/reservations/:id/release - Early release
reservationsRouter.post('/:id/release', authenticateToken, (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const released = releaseReservation(id, req.user!.userId);
    res.json({ success: true, released, message: 'Reservation released successfully.' });
  } catch (err: any) {
    res.status(400).json({
      success: false,
      error: { code: 'RELEASE_FAILED', message: err.message },
    });
  }
});
