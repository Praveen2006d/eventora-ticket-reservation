/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router } from 'express';
import { db } from '../db.ts';
import { authenticateToken, AuthenticatedRequest, requireRole } from '../auth.ts';
import QRCode from 'qrcode';

export const ticketsRouter = Router();

// GET /api/v1/tickets - Attendee tickets
ticketsRouter.get('/', authenticateToken, (req: AuthenticatedRequest, res) => {
  try {
    const rows = db.prepare(`
      SELECT t.id, t.ticket_code, t.qr_code_data, t.status, t.issued_at, t.checked_in_at,
             e.id as event_id, e.title as event_title, e.poster_url as event_poster, e.start_at as event_start, e.end_at as event_end,
             v.name as venue_name, v.city as venue_city, v.address as venue_address,
             tt.name as tier_name, tt.price as unit_price,
             o.order_number
      FROM tickets t
      JOIN order_items oi ON oi.id = t.order_item_id
      JOIN orders o ON o.id = oi.order_id
      JOIN ticket_tiers tt ON tt.id = oi.ticket_tier_id
      JOIN events e ON e.id = t.event_id
      JOIN venues v ON v.id = e.venue_id
      WHERE t.attendee_id = ?
      ORDER BY t.issued_at DESC
    `).all(req.user!.userId) as any[];

    const tickets = rows.map((t) => ({
      id: t.id,
      ticketCode: t.ticket_code,
      qrCodeData: t.qr_code_data,
      status: t.status,
      issuedAt: t.issued_at,
      checkedInAt: t.checked_in_at,
      eventId: t.event_id,
      eventTitle: t.event_title,
      eventPoster: t.event_poster,
      eventDate: t.event_start,
      venueName: t.venue_name,
      venueCity: t.venue_city,
      venueAddress: t.venue_address,
      tierName: t.tier_name,
      unitPrice: t.unit_price,
      orderNumber: t.order_number,
    }));

    res.json({ success: true, data: tickets });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// GET /api/v1/tickets/:id - Single ticket details and QR code Data URL
ticketsRouter.get('/:id', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;

    const ticket = db.prepare(`
      SELECT t.id, t.ticket_code, t.qr_code_data, t.status, t.issued_at, t.checked_in_at, t.attendee_id,
             e.id as event_id, e.title as event_title, e.poster_url as event_poster, e.start_at as event_start,
             v.name as venue_name, v.address as venue_address, v.city as venue_city, v.state as venue_state,
             tt.name as tier_name, tt.price as unit_price,
             u.name as attendee_name, u.email as attendee_email,
             o.order_number
      FROM tickets t
      JOIN users u ON u.id = t.attendee_id
      JOIN order_items oi ON oi.id = t.order_item_id
      JOIN orders o ON o.id = oi.order_id
      JOIN ticket_tiers tt ON tt.id = oi.ticket_tier_id
      JOIN events e ON e.id = t.event_id
      JOIN venues v ON v.id = e.venue_id
      WHERE t.id = ? OR t.ticket_code = ?
    `).get(id, id) as any;

    if (!ticket) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Ticket not found.' } });
      return;
    }

    if (ticket.attendee_id !== req.user!.userId && req.user!.role !== 'ADMIN' && req.user!.role !== 'ORGANIZER') {
      res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Unauthorized ticket access.' } });
      return;
    }

    // Generate real base64 QR code image
    const qrDataUrl = await QRCode.toDataURL(ticket.qr_code_data, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 256,
      color: {
        dark: '#1e1b4b',
        light: '#ffffff',
      },
    });

    res.json({
      success: true,
      data: {
        ...ticket,
        qrDataUrl,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// POST /api/v1/tickets/verify - Organizer / Admin Door Check-in Verification
ticketsRouter.post('/verify', authenticateToken, requireRole('ORGANIZER', 'ADMIN'), (req: AuthenticatedRequest, res) => {
  try {
    const { ticketCode, markCheckedIn = false } = req.body;

    if (!ticketCode) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Ticket code is required.' } });
      return;
    }

    const ticket = db.prepare(`
      SELECT t.id, t.ticket_code, t.status, t.issued_at, t.checked_in_at,
             u.name as attendee_name, u.email as attendee_email,
             e.id as event_id, e.title as event_title, e.organizer_id,
             tt.name as tier_name
      FROM tickets t
      JOIN users u ON u.id = t.attendee_id
      JOIN events e ON e.id = t.event_id
      JOIN order_items oi ON oi.id = t.order_item_id
      JOIN ticket_tiers tt ON tt.id = oi.ticket_tier_id
      WHERE t.ticket_code = ?
    `).get(ticketCode.trim().toUpperCase()) as any;

    if (!ticket) {
      res.status(404).json({
        success: false,
        valid: false,
        error: { code: 'TICKET_NOT_FOUND', message: 'Ticket does not exist in the system.' },
      });
      return;
    }

    // Multi-tenant check: Organizers can only verify tickets for their own events
    if (req.user!.role === 'ORGANIZER' && req.user!.organizerProfileId !== ticket.organizer_id) {
      res.status(403).json({
        success: false,
        valid: false,
        error: { code: 'TENANT_FORBIDDEN', message: 'You are not the organizer for this event.' },
      });
      return;
    }

    if (ticket.status === 'CANCELLED') {
      res.json({
        success: true,
        valid: false,
        status: 'CANCELLED',
        message: 'This ticket has been cancelled or refunded.',
        ticket,
      });
      return;
    }

    if (ticket.status === 'CHECKED_IN') {
      res.json({
        success: true,
        valid: false,
        status: 'ALREADY_CHECKED_IN',
        message: `Ticket already checked in at ${new Date(ticket.checked_in_at).toLocaleTimeString()}.`,
        ticket,
      });
      return;
    }

    let checkedInAt = ticket.checked_in_at;
    if (markCheckedIn) {
      checkedInAt = new Date().toISOString();
      db.prepare(`
        UPDATE tickets SET status = 'CHECKED_IN', checked_in_at = ? WHERE id = ?
      `).run(checkedInAt, ticket.id);

      db.prepare(`
        INSERT INTO audit_logs (id, actor_id, action, entity_type, entity_id, metadata, created_at)
        VALUES (?, ?, 'TICKET_CHECKED_IN', 'TICKET', ?, ?, ?)
      `).run(
        crypto.randomUUID(),
        req.user!.userId,
        ticket.id,
        JSON.stringify({ ticketCode: ticket.ticket_code, eventTitle: ticket.event_title }),
        checkedInAt
      );
    }

    res.json({
      success: true,
      valid: true,
      status: markCheckedIn ? 'CHECKED_IN' : 'VALID',
      message: markCheckedIn ? 'Ticket verified and successfully checked in!' : 'Ticket is authentic and valid.',
      ticket: {
        ...ticket,
        status: markCheckedIn ? 'CHECKED_IN' : 'VALID',
        checked_in_at: checkedInAt,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});
