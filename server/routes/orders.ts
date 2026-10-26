/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router } from 'express';
import { db } from '../db.ts';
import { authenticateToken, AuthenticatedRequest } from '../auth.ts';

export const ordersRouter = Router();

// GET /api/v1/orders - List attendee orders
ordersRouter.get('/', authenticateToken, (req: AuthenticatedRequest, res) => {
  try {
    const orders = db.prepare(`
      SELECT o.id, o.order_number, o.subtotal, o.fees, o.total_amount, o.currency, o.status, o.created_at,
             e.id as event_id, e.title as event_title, e.poster_url as event_poster, e.start_at as event_start,
             v.name as venue_name, v.city as venue_city,
             COUNT(t.id) as ticket_count
      FROM orders o
      JOIN order_items oi ON oi.order_id = o.id
      JOIN ticket_tiers tt ON tt.id = oi.ticket_tier_id
      JOIN events e ON e.id = tt.event_id
      JOIN venues v ON v.id = e.venue_id
      LEFT JOIN tickets t ON t.order_item_id = oi.id
      WHERE o.attendee_id = ?
      GROUP BY o.id
      ORDER BY o.created_at DESC
    `).all(req.user!.userId) as any[];

    res.json({ success: true, data: orders });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// GET /api/v1/orders/:id - Get order details
ordersRouter.get('/:id', authenticateToken, (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;

    const order = db.prepare(`
      SELECT o.id, o.order_number, o.subtotal, o.fees, o.total_amount, o.currency, o.status, o.created_at, o.attendee_id,
             e.id as event_id, e.title as event_title, e.poster_url as event_poster, e.start_at as event_start,
             v.name as venue_name, v.address as venue_address, v.city as venue_city, v.state as venue_state
      FROM orders o
      JOIN order_items oi ON oi.order_id = o.id
      JOIN ticket_tiers tt ON tt.id = oi.ticket_tier_id
      JOIN events e ON e.id = tt.event_id
      JOIN venues v ON v.id = e.venue_id
      WHERE o.id = ?
      LIMIT 1
    `).get(id) as any;

    if (!order) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Order not found.' } });
      return;
    }

    // Role check: Only owner or admin can view order
    if (order.attendee_id !== req.user!.userId && req.user!.role !== 'ADMIN') {
      res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Unauthorized access to order.' } });
      return;
    }

    const items = db.prepare(`
      SELECT oi.id, oi.quantity, oi.unit_price, tt.name as tier_name
      FROM order_items oi
      JOIN ticket_tiers tt ON tt.id = oi.ticket_tier_id
      WHERE oi.order_id = ?
    `).all(order.id);

    const tickets = db.prepare(`
      SELECT t.id, t.ticket_code, t.qr_code_data, t.status, t.issued_at, t.checked_in_at, tt.name as tier_name
      FROM tickets t
      JOIN order_items oi ON oi.id = t.order_item_id
      JOIN ticket_tiers tt ON tt.id = oi.ticket_tier_id
      WHERE oi.order_id = ?
    `).all(order.id);

    res.json({
      success: true,
      data: {
        ...order,
        items,
        tickets,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});
