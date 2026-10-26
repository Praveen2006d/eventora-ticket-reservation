/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router } from 'express';
import { authenticateToken, AuthenticatedRequest } from '../auth.ts';
import { checkoutReservation, getPaymentStatus } from '../paymentService.ts';

export const paymentsRouter = Router();

// POST /api/v1/payments/checkout - Initiate checkout
paymentsRouter.post('/checkout', authenticateToken, (req: AuthenticatedRequest, res) => {
  try {
    const { reservationId, outcomeSimulation = 'APPROVE' } = req.body;
    const idempotencyKey = (req.headers['idempotency-key'] as string) || req.body.idempotencyKey;

    if (!reservationId) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Reservation ID is required.' },
      });
      return;
    }

    const result = checkoutReservation(req.user!.userId, {
      reservationId,
      outcomeSimulation,
      idempotencyKey,
    });

    res.status(202).json({
      success: true,
      data: result,
      message: 'Payment simulation initiated.',
    });
  } catch (err: any) {
    res.status(400).json({
      success: false,
      error: { code: 'CHECKOUT_FAILED', message: err.message },
    });
  }
});

// GET /api/v1/payments/:id/status - Poll status of payment or order
paymentsRouter.get('/:id/status', authenticateToken, (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const status = getPaymentStatus(id);
    res.json({ success: true, data: status });
  } catch (err: any) {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: err.message },
    });
  }
});
