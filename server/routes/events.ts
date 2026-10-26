/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router } from 'express';
import { db } from '../db.ts';
import { cache } from '../cache.ts';
import crypto from 'node:crypto';
import { reclaimExpiredHolds } from '../reservationEngine.ts';

export const eventsRouter = Router();

// GET /api/v1/events - Public Event Discovery
eventsRouter.get('/', async (req, res) => {
  try {
    const { q, category, city, bypassCache } = req.query;

    const queryKey = `events:published:${crypto.createHash('md5').update(JSON.stringify(req.query)).digest('hex')}`;

    if (!bypassCache) {
      const cached = await cache.get(queryKey);
      if (cached) {
        res.json({ success: true, data: cached, cached: true });
        return;
      }
    }

    // Reclaim expired holds so remaining availability is always up to date
    reclaimExpiredHolds();

    let sql = `
      SELECT e.id, e.title, e.slug, e.description, e.category, e.poster_url, e.start_at, e.end_at,
             e.sales_start_at, e.sales_cutoff_at, e.status,
             v.id as venue_id, v.name as venue_name, v.city as venue_city, v.state as venue_state,
             op.id as organizer_id, op.organization_name,
             MIN(tt.price) as starting_price,
             SUM(tt.available_quantity) as total_available_tickets,
             SUM(tt.total_quantity) as total_tickets
      FROM events e
      JOIN venues v ON v.id = e.venue_id
      JOIN organizer_profiles op ON op.id = e.organizer_id
      LEFT JOIN ticket_tiers tt ON tt.event_id = e.id
      WHERE e.status = 'PUBLISHED'
    `;
    const params: any[] = [];

    if (q && typeof q === 'string') {
      sql += ` AND (e.title LIKE ? OR e.description LIKE ?)`;
      params.push(`%${q}%`, `%${q}%`);
    }

    if (category && typeof category === 'string' && category !== 'All') {
      sql += ` AND e.category = ?`;
      params.push(category);
    }

    if (city && typeof city === 'string' && city !== 'All' && city !== 'All Cities') {
      sql += ` AND v.city = ?`;
      params.push(city);
    }

    sql += ` GROUP BY e.id ORDER BY e.start_at ASC`;

    const rows = db.prepare(sql).all(...params) as any[];

    const events = rows.map((r) => ({
      id: r.id,
      title: r.title,
      slug: r.slug,
      description: r.description,
      category: r.category,
      posterUrl: r.poster_url,
      startAt: r.start_at,
      endAt: r.end_at,
      salesCutoffAt: r.sales_cutoff_at,
      status: r.status,
      startingPrice: r.starting_price || 0,
      totalAvailableTickets: r.total_available_tickets || 0,
      totalTickets: r.total_tickets || 0,
      venue: {
        id: r.venue_id,
        name: r.venue_name,
        city: r.venue_city,
        state: r.venue_state,
      },
      organizer: {
        id: r.organizer_id,
        organizationName: r.organization_name,
      },
    }));

    // Cache for 60 seconds
    await cache.set(queryKey, events, 60);

    res.json({ success: true, data: events });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// GET /api/v1/events/:id - Public Event Details
eventsRouter.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    reclaimExpiredHolds();

    const event = db.prepare(`
      SELECT e.id, e.title, e.slug, e.description, e.category, e.poster_url, e.start_at, e.end_at,
             e.sales_start_at, e.sales_cutoff_at, e.status,
             v.id as venue_id, v.name as venue_name, v.address as venue_address, v.city as venue_city, v.state as venue_state, v.capacity as venue_capacity,
             op.id as organizer_id, op.organization_name, op.description as organizer_description, op.verification_status
      FROM events e
      JOIN venues v ON v.id = e.venue_id
      JOIN organizer_profiles op ON op.id = e.organizer_id
      WHERE (e.id = ? OR e.slug = ?) AND e.status = 'PUBLISHED'
    `).get(id, id) as any;

    if (!event) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Event not found or not published.' } });
      return;
    }

    const tiers = db.prepare(`
      SELECT id, event_id, name, description, price, currency, total_quantity, available_quantity, reserved_quantity, sold_quantity, max_per_order
      FROM ticket_tiers
      WHERE event_id = ?
      ORDER BY price ASC
    `).all(event.id) as any[];

    const formattedTiers = tiers
      .filter((t: any) => !t.name.startsWith('Test '))
      .map((t: any) => ({
        id: t.id,
        eventId: t.event_id,
        name: t.name,
        description: t.description,
        price: t.price,
        currency: t.currency || 'INR',
        totalQuantity: t.total_quantity,
        availableQuantity: t.available_quantity,
        reservedQuantity: t.reserved_quantity,
        soldQuantity: t.sold_quantity,
        maxPerOrder: t.max_per_order,
      }));

    res.json({
      success: true,
      data: {
        id: event.id,
        title: event.title,
        slug: event.slug,
        description: event.description,
        category: event.category,
        posterUrl: event.poster_url,
        startAt: event.start_at,
        endAt: event.end_at,
        salesStartAt: event.sales_start_at,
        salesCutoffAt: event.sales_cutoff_at,
        status: event.status,
        venue: {
          id: event.venue_id,
          name: event.venue_name,
          address: event.venue_address,
          city: event.venue_city,
          state: event.venue_state,
          capacity: event.venue_capacity,
        },
        organizer: {
          id: event.organizer_id,
          organizationName: event.organization_name,
          description: event.organizer_description,
          verificationStatus: event.verification_status,
        },
        ticketTiers: formattedTiers,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// GET /api/v1/events/:id/ticket-tiers
eventsRouter.get('/:id/ticket-tiers', (req, res) => {
  try {
    const { id } = req.params;
    reclaimExpiredHolds();

    const tiers = db.prepare(`
      SELECT id, event_id, name, description, price, currency, total_quantity, available_quantity, reserved_quantity, sold_quantity, max_per_order
      FROM ticket_tiers
      WHERE event_id = ?
      ORDER BY price ASC
    `).all(id) as any[];

    const formattedTiers = tiers
      .filter((t) => !t.name.startsWith('Test '))
      .map((t) => ({
        id: t.id,
        eventId: t.event_id,
        name: t.name,
        description: t.description,
        price: t.price,
        currency: t.currency || 'USD',
        totalQuantity: t.total_quantity,
        availableQuantity: t.available_quantity,
        reservedQuantity: t.reserved_quantity,
        soldQuantity: t.sold_quantity,
        maxPerOrder: t.max_per_order,
      }));

    res.json({ success: true, data: formattedTiers });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});
