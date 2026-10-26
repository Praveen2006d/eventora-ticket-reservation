/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router } from 'express';
import { db } from '../db.ts';
import { authenticateToken, AuthenticatedRequest, requireRole } from '../auth.ts';
import { cache } from '../cache.ts';
import crypto from 'node:crypto';

export const organizerRouter = Router();

// Protect all organizer routes with RBAC
organizerRouter.use(authenticateToken, requireRole('ORGANIZER', 'ADMIN'));

// Helper to get active organizer profile ID
function getOrganizerId(req: AuthenticatedRequest): string {
  if (req.user?.organizerProfileId) {
    return req.user.organizerProfileId;
  }
  const profile = db.prepare('SELECT id FROM organizer_profiles WHERE user_id = ?').get(req.user!.userId) as { id: string } | undefined;
  if (!profile) {
    throw new Error('Organizer profile not found for user.');
  }
  return profile.id;
}

// GET /api/v1/organizer/events - List organizer's own events
organizerRouter.get('/events', (req: AuthenticatedRequest, res) => {
  try {
    const orgId = getOrganizerId(req);

    const events = db.prepare(`
      SELECT e.id, e.title, e.slug, e.description, e.category, e.poster_url, e.start_at, e.end_at,
             e.sales_start_at, e.sales_cutoff_at, e.status, e.created_at,
             v.id as venue_id, v.name as venue_name, v.city as venue_city,
             COALESCE(SUM(tt.total_quantity), 0) as total_inventory,
             COALESCE(SUM(tt.available_quantity), 0) as available_inventory,
             COALESCE(SUM(tt.reserved_quantity), 0) as reserved_inventory,
             COALESCE(SUM(tt.sold_quantity), 0) as sold_inventory,
             COALESCE(SUM(tt.sold_quantity * tt.price), 0) as total_revenue
      FROM events e
      JOIN venues v ON v.id = e.venue_id
      LEFT JOIN ticket_tiers tt ON tt.event_id = e.id
      WHERE e.organizer_id = ?
      GROUP BY e.id
      ORDER BY e.created_at DESC
    `).all(orgId) as any[];

    // Include tiers for each event
    const eventsWithTiers = events.map((e) => {
      const tiers = db.prepare(`
        SELECT id, name, description, price, currency, total_quantity, available_quantity, reserved_quantity, sold_quantity, max_per_order
        FROM ticket_tiers
        WHERE event_id = ?
      `).all(e.id);
      return { ...e, ticketTiers: tiers };
    });

    res.json({ success: true, data: eventsWithTiers });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// POST /api/v1/organizer/events - Create new event
organizerRouter.post('/events', (req: AuthenticatedRequest, res) => {
  try {
    const orgId = getOrganizerId(req);
    const {
      title,
      description,
      category,
      posterUrl,
      startAt,
      endAt,
      salesStartAt,
      salesCutoffAt,
      venueName,
      venueAddress = 'Mount Poonamallee Road',
      city = 'Chennai',
      state = 'Tamil Nadu',
      capacity = 1000,
      tiers = [],
    } = req.body;

    if (!title || !description || !category || !startAt || !endAt) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Title, description, category, start date, and end date are required.' },
      });
      return;
    }

    const startDate = new Date(startAt).getTime();
    const endDate = new Date(endAt).getTime();
    if (endDate <= startDate) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_DATES', message: 'Event end time must be strictly after event start time.' },
      });
      return;
    }

    const cutoffDate = salesCutoffAt ? new Date(salesCutoffAt).getTime() : startDate;
    if (cutoffDate > startDate) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_CUTOFF', message: 'Ticket sales cutoff cannot be after event start time.' },
      });
      return;
    }

    const now = new Date().toISOString();
    const eventId = `evt-${crypto.randomUUID()}`;
    const venueId = `ven-${crypto.randomUUID()}`;
    const slug = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Math.floor(1000 + Math.random() * 9000)}`;

    db.exec('BEGIN IMMEDIATE');

    try {
      // Create Venue
      db.prepare(`
        INSERT INTO venues (id, name, address, city, state, country, capacity, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, 'India', ?, ?, ?)
      `).run(venueId, venueName || `${title} Pavilion`, venueAddress, city, state, capacity, now, now);

      // Create Event (DRAFT by default)
      db.prepare(`
        INSERT INTO events (id, organizer_id, venue_id, title, slug, description, category, poster_url, start_at, end_at, sales_start_at, sales_cutoff_at, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'DRAFT', ?, ?)
      `).run(
        eventId,
        orgId,
        venueId,
        title,
        slug,
        description,
        category,
        posterUrl || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80',
        startAt,
        endAt,
        salesStartAt || now,
        salesCutoffAt || startAt,
        now,
        now
      );

      // Insert Initial Ticket Tiers if provided
      const defaultTiers = tiers.length > 0 ? tiers : [
        { name: 'General Admission', price: 49900, totalQuantity: 100, maxPerOrder: 6 },
        { name: 'VIP Pass', price: 149900, totalQuantity: 25, maxPerOrder: 4 },
      ];

      const insertTier = db.prepare(`
        INSERT INTO ticket_tiers (id, event_id, name, description, price, currency, total_quantity, available_quantity, reserved_quantity, sold_quantity, max_per_order, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, 'INR', ?, ?, 0, 0, ?, ?, ?)
      `);

      for (const t of defaultTiers) {
        const tierId = `tier-${crypto.randomUUID()}`;
        insertTier.run(
          tierId,
          eventId,
          t.name,
          t.description || `${t.name} admission tier`,
          t.price,
          t.totalQuantity,
          t.totalQuantity,
          t.maxPerOrder || 6,
          now,
          now
        );
      }

      // Audit Log
      db.prepare(`
        INSERT INTO audit_logs (id, actor_id, action, entity_type, entity_id, metadata, created_at)
        VALUES (?, ?, 'EVENT_CREATED', 'EVENT', ?, ?, ?)
      `).run(crypto.randomUUID(), req.user!.userId, eventId, JSON.stringify({ title, status: 'DRAFT' }), now);

      db.exec('COMMIT');

      cache.invalidatePattern('events:');

      res.status(201).json({
        success: true,
        data: {
          id: eventId,
          title,
          slug,
          status: 'DRAFT',
          message: 'Event created as DRAFT. You can now configure ticket tiers and publish it.',
        },
      });
    } catch (e) {
      try { db.exec('ROLLBACK'); } catch {}
      throw e;
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// PATCH /api/v1/organizer/events/:id - Update own event
organizerRouter.patch('/events/:id', (req: AuthenticatedRequest, res) => {
  try {
    const orgId = getOrganizerId(req);
    const { id } = req.params;

    // Strict Tenant Isolation check
    const event = db.prepare('SELECT id, organizer_id, status FROM events WHERE id = ?').get(id) as any;
    if (!event) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Event not found.' } });
      return;
    }

    if (req.user!.role !== 'ADMIN' && event.organizer_id !== orgId) {
      res.status(403).json({
        success: false,
        error: { code: 'TENANT_FORBIDDEN', message: 'Access denied. You do not own this event.' },
      });
      return;
    }

    const { title, description, category, posterUrl, startAt, endAt, salesCutoffAt } = req.body;
    const now = new Date().toISOString();

    db.prepare(`
      UPDATE events
      SET title = COALESCE(?, title),
          description = COALESCE(?, description),
          category = COALESCE(?, category),
          poster_url = COALESCE(?, poster_url),
          start_at = COALESCE(?, start_at),
          end_at = COALESCE(?, end_at),
          sales_cutoff_at = COALESCE(?, sales_cutoff_at),
          updated_at = ?
      WHERE id = ?
    `).run(title, description, category, posterUrl, startAt, endAt, salesCutoffAt, now, id);

    cache.invalidatePattern('events:');

    res.json({ success: true, message: 'Event updated successfully.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// POST /api/v1/organizer/events/:id/publish - Publish event to public listings
organizerRouter.post('/events/:id/publish', (req: AuthenticatedRequest, res) => {
  try {
    const orgId = getOrganizerId(req);
    const { id } = req.params;

    const event = db.prepare('SELECT id, organizer_id, status, title FROM events WHERE id = ?').get(id) as any;
    if (!event) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Event not found.' } });
      return;
    }

    if (req.user!.role !== 'ADMIN' && event.organizer_id !== orgId) {
      res.status(403).json({ success: false, error: { code: 'TENANT_FORBIDDEN', message: 'You do not own this event.' } });
      return;
    }

    // Verify event has at least one ticket tier with positive inventory
    const tierCount = db.prepare('SELECT COUNT(*) as count FROM ticket_tiers WHERE event_id = ? AND total_quantity > 0').get(id) as { count: number };
    if (tierCount.count === 0) {
      res.status(400).json({
        success: false,
        error: { code: 'NO_TIERS', message: 'Cannot publish an event without at least one active ticket tier.' },
      });
      return;
    }

    const now = new Date().toISOString();
    db.prepare(`UPDATE events SET status = 'PUBLISHED', updated_at = ? WHERE id = ?`).run(now, id);

    cache.invalidatePattern('events:');

    res.json({ success: true, message: `Event '${event.title}' is now PUBLISHED and live on public discovery.` });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// POST /api/v1/organizer/events/:id/unpublish - Revert to DRAFT
organizerRouter.post('/events/:id/unpublish', (req: AuthenticatedRequest, res) => {
  try {
    const orgId = getOrganizerId(req);
    const { id } = req.params;

    const event = db.prepare('SELECT id, organizer_id FROM events WHERE id = ?').get(id) as any;
    if (!event || (req.user!.role !== 'ADMIN' && event.organizer_id !== orgId)) {
      res.status(403).json({ success: false, error: { code: 'TENANT_FORBIDDEN', message: 'Forbidden.' } });
      return;
    }

    const now = new Date().toISOString();
    db.prepare(`UPDATE events SET status = 'DRAFT', updated_at = ? WHERE id = ?`).run(now, id);

    cache.invalidatePattern('events:');
    res.json({ success: true, message: 'Event unpublished and reverted to DRAFT.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// POST /api/v1/organizer/events/:id/ticket-tiers - Add ticket tier
organizerRouter.post('/events/:id/ticket-tiers', (req: AuthenticatedRequest, res) => {
  try {
    const orgId = getOrganizerId(req);
    const { id } = req.params;
    const { name, description, price, totalQuantity, maxPerOrder = 6 } = req.body;

    const event = db.prepare('SELECT id, organizer_id FROM events WHERE id = ?').get(id) as any;
    if (!event || (req.user!.role !== 'ADMIN' && event.organizer_id !== orgId)) {
      res.status(403).json({ success: false, error: { code: 'TENANT_FORBIDDEN', message: 'Forbidden.' } });
      return;
    }

    if (!name || price === undefined || !totalQuantity || totalQuantity <= 0) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Name, price, and positive total quantity required.' } });
      return;
    }

    const tierId = `tier-${crypto.randomUUID()}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO ticket_tiers (id, event_id, name, description, price, currency, total_quantity, available_quantity, reserved_quantity, sold_quantity, max_per_order, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'INR', ?, ?, 0, 0, ?, ?, ?)
    `).run(tierId, id, name, description || '', price, totalQuantity, totalQuantity, maxPerOrder, now, now);

    cache.invalidatePattern('events:');
    res.status(201).json({ success: true, data: { id: tierId, name, price, totalQuantity } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// PATCH /api/v1/organizer/ticket-tiers/:id - Update tier (prevents lowering below reserved+sold)
organizerRouter.patch('/ticket-tiers/:id', (req: AuthenticatedRequest, res) => {
  try {
    const orgId = getOrganizerId(req);
    const { id } = req.params;
    const { name, price, newTotalQuantity } = req.body;

    const tier = db.prepare(`
      SELECT tt.id, tt.name, tt.price, tt.total_quantity, tt.available_quantity, tt.reserved_quantity, tt.sold_quantity, e.organizer_id
      FROM ticket_tiers tt
      JOIN events e ON e.id = tt.event_id
      WHERE tt.id = ?
    `).get(id) as any;

    if (!tier) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Ticket tier not found.' } });
      return;
    }

    if (req.user!.role !== 'ADMIN' && tier.organizer_id !== orgId) {
      res.status(403).json({ success: false, error: { code: 'TENANT_FORBIDDEN', message: 'Forbidden.' } });
      return;
    }

    db.exec('BEGIN IMMEDIATE');

    try {
      const now = new Date().toISOString();
      let updatedTotal = tier.total_quantity;
      let updatedAvailable = tier.available_quantity;

      if (newTotalQuantity !== undefined) {
        const minAllowed = tier.reserved_quantity + tier.sold_quantity;
        if (newTotalQuantity < minAllowed) {
          throw new Error(`Total inventory cannot be reduced below active holds plus sales (${minAllowed}).`);
        }
        const delta = newTotalQuantity - tier.total_quantity;
        updatedTotal = newTotalQuantity;
        updatedAvailable = tier.available_quantity + delta;
      }

      db.prepare(`
        UPDATE ticket_tiers
        SET name = COALESCE(?, name),
            price = COALESCE(?, price),
            total_quantity = ?,
            available_quantity = ?,
            updated_at = ?
        WHERE id = ?
      `).run(name, price, updatedTotal, updatedAvailable, now, id);

      db.exec('COMMIT');
      cache.invalidatePattern('events:');

      res.json({ success: true, message: 'Ticket tier updated successfully.' });
    } catch (e) {
      try { db.exec('ROLLBACK'); } catch {}
      throw e;
    }
  } catch (err: any) {
    res.status(400).json({ success: false, error: { code: 'UPDATE_FAILED', message: err.message } });
  }
});

// GET /api/v1/organizer/events/:id/attendees - Authorized Attendee list with CSV export support
organizerRouter.get('/events/:id/attendees', (req: AuthenticatedRequest, res) => {
  try {
    const orgId = getOrganizerId(req);
    const { id } = req.params;
    const { format } = req.query;

    const event = db.prepare('SELECT id, organizer_id, title FROM events WHERE id = ?').get(id) as any;
    if (!event || (req.user!.role !== 'ADMIN' && event.organizer_id !== orgId)) {
      res.status(403).json({ success: false, error: { code: 'TENANT_FORBIDDEN', message: 'Forbidden.' } });
      return;
    }

    const attendees = db.prepare(`
      SELECT t.id as ticket_id, t.ticket_code, t.status as ticket_status, t.issued_at, t.checked_in_at,
             u.name as attendee_name, u.email as attendee_email,
             tt.name as tier_name, tt.price as unit_price,
             o.order_number, o.created_at as order_date
      FROM tickets t
      JOIN users u ON u.id = t.attendee_id
      JOIN order_items oi ON oi.id = t.order_item_id
      JOIN orders o ON o.id = oi.order_id
      JOIN ticket_tiers tt ON tt.id = oi.ticket_tier_id
      WHERE t.event_id = ?
      ORDER BY t.issued_at DESC
    `).all(id) as any[];

    if (format === 'csv') {
      const csvHeader = 'Ticket Code,Attendee Name,Email,Tier,Price INR,Status,Order Number,Issued At,Checked In At\n';
      const csvRows = attendees
        .map((a) =>
          `"${a.ticket_code}","${a.attendee_name}","${a.attendee_email}","${a.tier_name}",${(a.unit_price / 100).toFixed(2)},"${a.ticket_status}","${a.order_number}","${a.issued_at}","${a.checked_in_at || ''}"`
        )
        .join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="attendees-${event.id}.csv"`);
      res.send(csvHeader + csvRows);
      return;
    }

    res.json({ success: true, data: { eventTitle: event.title, attendees } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// GET /api/v1/organizer/analytics/overview - Real database aggregation KPIs
organizerRouter.get('/analytics/overview', (req: AuthenticatedRequest, res) => {
  try {
    const orgId = getOrganizerId(req);

    // Aggregate metrics strictly across events owned by this organizer
    const inventoryStats = db.prepare(`
      SELECT
        COALESCE(SUM(tt.total_quantity), 0) as total_inventory,
        COALESCE(SUM(tt.available_quantity), 0) as available_inventory,
        COALESCE(SUM(tt.reserved_quantity), 0) as reserved_inventory,
        COALESCE(SUM(tt.sold_quantity), 0) as sold_inventory
      FROM ticket_tiers tt
      JOIN events e ON e.id = tt.event_id
      WHERE e.organizer_id = ?
    `).get(orgId) as any;

    const orderStats = db.prepare(`
      SELECT
        COUNT(DISTINCT o.id) as total_orders,
        COUNT(DISTINCT CASE WHEN o.status = 'CONFIRMED' THEN o.id END) as confirmed_orders,
        COALESCE(SUM(CASE WHEN o.status = 'CONFIRMED' THEN o.total_amount ELSE 0 END), 0) as total_revenue,
        COALESCE(SUM(CASE WHEN o.status = 'CONFIRMED' THEN o.subtotal ELSE 0 END), 0) as gross_booking_value,
        COUNT(DISTINCT pt.id) as total_payments,
        COUNT(DISTINCT CASE WHEN pt.status = 'APPROVED' THEN pt.id END) as successful_payments,
        COUNT(DISTINCT CASE WHEN pt.status IN ('DECLINED', 'TIMED_OUT', 'FAILED') THEN pt.id END) as failed_payments
      FROM orders o
      JOIN order_items oi ON oi.order_id = o.id
      JOIN ticket_tiers tt ON tt.id = oi.ticket_tier_id
      JOIN events e ON e.id = tt.event_id
      LEFT JOIN payment_transactions pt ON pt.order_id = o.id
      WHERE e.organizer_id = ?
    `).get(orgId) as any;

    // Conversion rate: Confirmed Orders / Total Reservation Sessions * 100
    const totalReservations = db.prepare(`
      SELECT COUNT(DISTINCT r.id) as count
      FROM reservations r
      JOIN reservation_items ri ON ri.reservation_id = r.id
      JOIN ticket_tiers tt ON tt.id = ri.ticket_tier_id
      JOIN events e ON e.id = tt.event_id
      WHERE e.organizer_id = ?
    `).get(orgId) as { count: number };

    const reservationSessions = Math.max(1, totalReservations.count);
    const confirmedCount = orderStats.confirmed_orders || 0;
    const conversionRate = Math.min(100, Math.round((confirmedCount / reservationSessions) * 100));

    res.json({
      success: true,
      data: {
        totalRevenue: orderStats.total_revenue,
        grossBookingValue: orderStats.gross_booking_value,
        ticketsSold: inventoryStats.sold_inventory,
        ticketsReserved: inventoryStats.reserved_inventory,
        availableInventory: inventoryStats.available_inventory,
        totalInventory: inventoryStats.total_inventory,
        totalOrders: orderStats.total_orders,
        confirmedOrders: orderStats.confirmed_orders,
        successfulPayments: orderStats.successful_payments,
        failedPayments: orderStats.failed_payments,
        conversionRate,
        reservationSessions: totalReservations.count,
        currency: 'INR',
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// GET /api/v1/organizer/analytics/revenue - Charts and breakdown
organizerRouter.get('/analytics/revenue', (req: AuthenticatedRequest, res) => {
  try {
    const orgId = getOrganizerId(req);

    // Event-wise breakdown
    const eventBreakdown = db.prepare(`
      SELECT e.id, e.title,
             COALESCE(SUM(tt.sold_quantity * tt.price), 0) as revenue,
             COALESCE(SUM(tt.sold_quantity), 0) as tickets_sold,
             COALESCE(SUM(tt.total_quantity), 0) as total_capacity
      FROM events e
      LEFT JOIN ticket_tiers tt ON tt.event_id = e.id
      WHERE e.organizer_id = ?
      GROUP BY e.id
    `).all(orgId);

    // Tier performance
    const tierPerformance = db.prepare(`
      SELECT tt.name as tier_name, tt.price, tt.total_quantity, tt.sold_quantity, tt.reserved_quantity, tt.available_quantity,
             e.title as event_title
      FROM ticket_tiers tt
      JOIN events e ON e.id = tt.event_id
      WHERE e.organizer_id = ?
      ORDER BY tt.sold_quantity DESC
    `).all(orgId);

    res.json({
      success: true,
      data: {
        eventBreakdown,
        tierPerformance,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});
