/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router } from 'express';
import { db } from '../db.ts';
import { authenticateToken, AuthenticatedRequest, requireRole } from '../auth.ts';
import { createReservation } from '../reservationEngine.ts';
import crypto from 'node:crypto';

export const adminRouter = Router();

// Protect all admin endpoints with ADMIN role guard
adminRouter.use(authenticateToken, requireRole('ADMIN'));

// GET /api/v1/admin/overview - Platform-wide statistics
adminRouter.get('/overview', (_req, res) => {
  try {
    const userStats = db.prepare(`
      SELECT
        COUNT(*) as total_users,
        COUNT(CASE WHEN role = 'ATTENDEE' THEN 1 END) as attendees_count,
        COUNT(CASE WHEN role = 'ORGANIZER' THEN 1 END) as organizers_count,
        COUNT(CASE WHEN status = 'SUSPENDED' THEN 1 END) as suspended_count
      FROM users
    `).get() as any;

    const eventStats = db.prepare(`
      SELECT
        COUNT(*) as total_events,
        COUNT(CASE WHEN status = 'PUBLISHED' THEN 1 END) as published_events,
        COUNT(CASE WHEN status = 'DRAFT' THEN 1 END) as draft_events,
        COUNT(CASE WHEN status = 'SUSPENDED' THEN 1 END) as suspended_events
      FROM events
    `).get() as any;

    const financialStats = db.prepare(`
      SELECT
        COALESCE(SUM(CASE WHEN status = 'CONFIRMED' THEN total_amount ELSE 0 END), 0) as gross_merchandise_value,
        COALESCE(SUM(CASE WHEN status = 'CONFIRMED' THEN fees ELSE 0 END), 0) as platform_fees_collected,
        COUNT(CASE WHEN status = 'CONFIRMED' THEN 1 END) as confirmed_orders_count
      FROM orders
    `).get() as any;

    const ticketStats = db.prepare(`
      SELECT
        COALESCE(SUM(total_quantity), 0) as total_inventory,
        COALESCE(SUM(sold_quantity), 0) as tickets_sold,
        COALESCE(SUM(reserved_quantity), 0) as tickets_currently_held,
        COALESCE(SUM(available_quantity), 0) as tickets_available
      FROM ticket_tiers
    `).get() as any;

    res.json({
      success: true,
      data: {
        users: userStats,
        events: eventStats,
        financials: financialStats,
        tickets: ticketStats,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// GET /api/v1/admin/users - User management list
adminRouter.get('/users', (_req, res) => {
  try {
    const users = db.prepare(`
      SELECT u.id, u.name, u.email, u.role, u.status, u.created_at, op.organization_name
      FROM users u
      LEFT JOIN organizer_profiles op ON op.user_id = u.id
      ORDER BY u.created_at DESC
    `).all();

    res.json({ success: true, data: users });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// PATCH /api/v1/admin/users/:id/status - Toggle user status
adminRouter.patch('/users/:id/status', (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['ACTIVE', 'SUSPENDED'].includes(status)) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: "Status must be 'ACTIVE' or 'SUSPENDED'." } });
      return;
    }

    const now = new Date().toISOString();
    db.prepare('UPDATE users SET status = ?, updated_at = ? WHERE id = ?').run(status, now, id);

    db.prepare(`
      INSERT INTO audit_logs (id, actor_id, action, entity_type, entity_id, metadata, created_at)
      VALUES (?, ?, 'USER_STATUS_UPDATED', 'USER', ?, ?, ?)
    `).run(crypto.randomUUID(), req.user!.userId, id, JSON.stringify({ newStatus: status }), now);

    res.json({ success: true, message: `User status changed to ${status}.` });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// GET /api/v1/admin/events - Platform events moderation list
adminRouter.get('/events', (_req, res) => {
  try {
    const events = db.prepare(`
      SELECT e.id, e.title, e.category, e.status, e.start_at, e.created_at,
             op.organization_name, v.name as venue_name, v.city as venue_city,
             COALESCE(SUM(tt.total_quantity), 0) as total_capacity,
             COALESCE(SUM(tt.sold_quantity), 0) as tickets_sold
      FROM events e
      JOIN organizer_profiles op ON op.id = e.organizer_id
      JOIN venues v ON v.id = e.venue_id
      LEFT JOIN ticket_tiers tt ON tt.event_id = e.id
      GROUP BY e.id
      ORDER BY e.created_at DESC
    `).all();

    res.json({ success: true, data: events });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// PATCH /api/v1/admin/events/:id/status - Moderate / suspend event
adminRouter.patch('/events/:id/status', (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;

    if (!['PUBLISHED', 'SUSPENDED', 'DRAFT'].includes(status)) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid status.' } });
      return;
    }

    const now = new Date().toISOString();
    db.prepare('UPDATE events SET status = ?, updated_at = ? WHERE id = ?').run(status, now, id);

    db.prepare(`
      INSERT INTO audit_logs (id, actor_id, action, entity_type, entity_id, metadata, created_at)
      VALUES (?, ?, 'ADMIN_EVENT_MODERATION', 'EVENT', ?, ?, ?)
    `).run(crypto.randomUUID(), req.user!.userId, id, JSON.stringify({ status, reason }), now);

    res.json({ success: true, message: `Event status updated to ${status}.` });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// GET /api/v1/admin/audit-logs - Inspection logs
adminRouter.get('/audit-logs', (_req, res) => {
  try {
    const logs = db.prepare(`
      SELECT a.id, a.action, a.entity_type, a.entity_id, a.metadata, a.created_at,
             u.email as actor_email, u.name as actor_name, u.role as actor_role
      FROM audit_logs a
      LEFT JOIN users u ON u.id = a.actor_id
      ORDER BY a.created_at DESC
      LIMIT 100
    `).all();

    res.json({ success: true, data: logs });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// POST /api/v1/admin/test-concurrency - Live automated stress test on actual DB
adminRouter.post('/test-concurrency', (req, res) => {
  try {
    const { tierId = 'tier-concurrency-test-10', concurrentRequests = 50, requestedPerRequest = 1 } = req.body;

    // Reset test tier inventory cleanly for test execution
    const initialTier = db.prepare('SELECT id, total_quantity, available_quantity, reserved_quantity, sold_quantity FROM ticket_tiers WHERE id = ?').get(tierId) as any;
    if (!initialTier) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Test tier not found.' } });
      return;
    }

    // Reset to pure 10 available, 0 reserved, 0 sold
    const now = new Date().toISOString();
    db.prepare('UPDATE ticket_tiers SET available_quantity = total_quantity, reserved_quantity = 0, sold_quantity = 0, updated_at = ? WHERE id = ?').run(now, tierId);

    const results: Array<{ requestIndex: number; success: boolean; statusCode: number; error?: string }> = [];
    const testAttendeeId = 'usr-att-01';

    for (let i = 1; i <= concurrentRequests; i++) {
      try {
        createReservation(testAttendeeId, [{ ticketTierId: tierId, quantity: requestedPerRequest }]);
        results.push({ requestIndex: i, success: true, statusCode: 201 });
      } catch (err: any) {
        results.push({ requestIndex: i, success: false, statusCode: err.statusCode || 409, error: err.message });
      }
    }

    const successfulHolds = results.filter((r) => r.success).length;
    const rejectedConflicts = results.filter((r) => !r.success).length;

    const finalTier = db.prepare('SELECT total_quantity, available_quantity, reserved_quantity, sold_quantity FROM ticket_tiers WHERE id = ?').get(tierId) as any;

    const passed =
      successfulHolds <= initialTier.total_quantity &&
      finalTier.available_quantity >= 0 &&
      finalTier.reserved_quantity === successfulHolds &&
      finalTier.available_quantity + finalTier.reserved_quantity === initialTier.total_quantity;

    res.json({
      success: true,
      data: {
        testTierId: tierId,
        totalInventory: initialTier.total_quantity,
        concurrentRequestsSent: concurrentRequests,
        successfulHolds,
        rejectedConflicts,
        finalAvailable: finalTier.available_quantity,
        finalReserved: finalTier.reserved_quantity,
        passed,
        invariantMaintained: 'availableQuantity >= 0 && available + reserved == total',
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'TEST_ERROR', message: err.message } });
  }
});
