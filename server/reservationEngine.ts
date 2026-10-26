/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { db } from './db.ts';
import { cache } from './cache.ts';
import crypto from 'node:crypto';

export interface ReservationRequestItem {
  ticketTierId: string;
  quantity: number;
}

export interface CreateReservationResult {
  reservationId: string;
  expiresAt: string;
  expiresInSeconds: number;
  subtotal: number;
  fees: number;
  totalAmount: number;
  items: Array<{
    ticketTierId: string;
    tierName: string;
    quantity: number;
    unitPrice: number;
    remainingAvailable: number;
  }>;
  event: {
    id: string;
    title: string;
    posterUrl: string;
    startAt: string;
  };
}

/**
 * Reclaim any expired reservations across the entire system.
 * Atomic and idempotent.
 */
export function reclaimExpiredHolds(): number {
  const now = new Date().toISOString();

  // Find all reservations that are still HELD or PAYMENT_PENDING but whose expires_at has passed
  const expiredReservations = db.prepare(`
    SELECT id FROM reservations
    WHERE (status = 'HELD' OR status = 'PAYMENT_PENDING')
      AND expires_at <= ?
  `).all(now) as Array<{ id: string }>;

  if (expiredReservations.length === 0) {
    return 0;
  }

  let reclaimedCount = 0;

  for (const res of expiredReservations) {
    try {
      db.exec('BEGIN IMMEDIATE');

      // Verify status again inside lock
      const current = db.prepare('SELECT id, status FROM reservations WHERE id = ?').get(res.id) as { id: string; status: string } | undefined;
      if (!current || (current.status !== 'HELD' && current.status !== 'PAYMENT_PENDING')) {
        db.exec('ROLLBACK');
        continue;
      }

      // Mark reservation EXPIRED
      db.prepare(`
        UPDATE reservations
        SET status = 'EXPIRED', updated_at = ?
        WHERE id = ?
      `).run(now, res.id);

      // Return inventory back to available
      const items = db.prepare(`
        SELECT ticket_tier_id, quantity FROM reservation_items WHERE reservation_id = ?
      `).all(res.id) as Array<{ ticket_tier_id: string; quantity: number }>;

      for (const item of items) {
        db.prepare(`
          UPDATE ticket_tiers
          SET reserved_quantity = reserved_quantity - ?,
              available_quantity = available_quantity + ?,
              updated_at = ?
          WHERE id = ? AND reserved_quantity >= ?
        `).run(item.quantity, item.quantity, now, item.ticket_tier_id, item.quantity);
      }

      // Record audit log
      db.prepare(`
        INSERT INTO audit_logs (id, actor_id, action, entity_type, entity_id, metadata, created_at)
        VALUES (?, NULL, 'RESERVATION_EXPIRED_RECLAIMED', 'RESERVATION', ?, ?, ?)
      `).run(
        crypto.randomUUID(),
        res.id,
        JSON.stringify({ reason: '10-minute hold window expired' }),
        now
      );

      db.exec('COMMIT');
      reclaimedCount++;
    } catch (err) {
      try { db.exec('ROLLBACK'); } catch {}
      console.error(`[ReservationEngine] Error reclaiming expired reservation ${res.id}:`, err);
    }
  }

  if (reclaimedCount > 0) {
    cache.invalidatePattern('events:');
  }

  return reclaimedCount;
}

/**
 * Creates a concurrent-safe reservation holding ticket inventory for exactly 10 minutes.
 * Uses atomic row-level conditional locking in a database transaction.
 */
export function createReservation(
  attendeeId: string,
  items: ReservationRequestItem[],
  idempotencyKey?: string
): CreateReservationResult {
  if (!items || items.length === 0) {
    throw new Error('No ticket items specified.');
  }

  // First step: Reclaim any expired holds system-wide to ensure inventory is accurate
  reclaimExpiredHolds();

  // Check idempotency: If the client retried with the exact same key, return existing active reservation
  if (idempotencyKey) {
    const existing = db.prepare(`
      SELECT r.id, r.status, r.expires_at, r.created_at
      FROM reservations r
      WHERE r.idempotency_key = ? AND r.attendee_id = ?
    `).get(idempotencyKey, attendeeId) as { id: string; status: string; expires_at: string; created_at: string } | undefined;

    if (existing && (existing.status === 'HELD' || existing.status === 'PAYMENT_PENDING')) {
      const nowMs = Date.now();
      const expiresMs = new Date(existing.expires_at).getTime();
      if (expiresMs > nowMs) {
        return getReservationSummary(existing.id);
      }
    }
  }

  // Sort tiers by ID deterministically to prevent deadlocks across concurrent multiple-tier requests
  const sortedItems = [...items].sort((a, b) => a.ticketTierId.localeCompare(b.ticketTierId));

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 10 * 60 * 1000).toISOString(); // Exactly 10 minutes
  const reservationId = `res-${crypto.randomUUID()}`;

  // Execute in an immediate transactional write lock
  db.exec('BEGIN IMMEDIATE');

  try {
    let subtotal = 0;
    const reservedDetails: CreateReservationResult['items'] = [];
    let eventInfo: any = null;

    for (const item of sortedItems) {
      if (item.quantity <= 0) {
        throw new Error('Quantity must be greater than zero.');
      }

      // Fetch tier and related event with full integrity checks
      const tier = db.prepare(`
        SELECT t.id, t.name, t.price, t.available_quantity, t.reserved_quantity, t.total_quantity, t.max_per_order,
               e.id as event_id, e.title as event_title, e.poster_url as event_poster, e.start_at as event_start,
               e.sales_start_at, e.sales_cutoff_at, e.status as event_status
        FROM ticket_tiers t
        JOIN events e ON e.id = t.event_id
        WHERE t.id = ?
      `).get(item.ticketTierId) as any;

      if (!tier) {
        throw new Error(`Ticket tier '${item.ticketTierId}' not found.`);
      }

      if (tier.event_status !== 'PUBLISHED') {
        throw new Error(`Event '${tier.event_title}' is not open for ticket reservations.`);
      }

      // Check sales window
      const nowTime = now.getTime();
      if (tier.sales_start_at && new Date(tier.sales_start_at).getTime() > nowTime) {
        throw new Error(`Ticket sales have not started yet for ${tier.name}.`);
      }
      if (tier.sales_cutoff_at && new Date(tier.sales_cutoff_at).getTime() <= nowTime) {
        throw new Error(`Ticket sales have ended for this event.`);
      }

      if (item.quantity > tier.max_per_order) {
        throw new Error(`Maximum ${tier.max_per_order} tickets allowed per order for ${tier.name}.`);
      }

      // ATOMIC ROW UPDATE: verify available_quantity >= requested quantity
      // If concurrent transactions depleted inventory, changes will be 0!
      const updateResult = db.prepare(`
        UPDATE ticket_tiers
        SET available_quantity = available_quantity - ?,
            reserved_quantity = reserved_quantity + ?,
            updated_at = ?
        WHERE id = ? AND available_quantity >= ?
      `).run(item.quantity, item.quantity, now.toISOString(), item.ticketTierId, item.quantity);

      if (updateResult.changes === 0) {
        const conflictErr = new Error(`Insufficient inventory for '${tier.name}'. Only ${tier.available_quantity} available.`);
        (conflictErr as any).statusCode = 409;
        (conflictErr as any).code = 'INSUFFICIENT_INVENTORY';
        throw conflictErr;
      }

      // Fetch updated remaining available quantity
      const refreshedTier = db.prepare('SELECT available_quantity FROM ticket_tiers WHERE id = ?').get(item.ticketTierId) as { available_quantity: number };

      subtotal += tier.price * item.quantity;
      reservedDetails.push({
        ticketTierId: tier.id,
        tierName: tier.name,
        quantity: item.quantity,
        unitPrice: tier.price,
        remainingAvailable: refreshedTier.available_quantity,
      });

      if (!eventInfo) {
        eventInfo = {
          id: tier.event_id,
          title: tier.event_title,
          posterUrl: tier.event_poster,
          startAt: tier.event_start,
        };
      }
    }

    // Insert Reservation
    db.prepare(`
      INSERT INTO reservations (id, attendee_id, status, idempotency_key, expires_at, created_at, updated_at)
      VALUES (?, ?, 'HELD', ?, ?, ?, ?)
    `).run(
      reservationId,
      attendeeId,
      idempotencyKey || null,
      expiresAt,
      now.toISOString(),
      now.toISOString()
    );

    // Insert Reservation Items
    const insertItem = db.prepare(`
      INSERT INTO reservation_items (id, reservation_id, ticket_tier_id, quantity, unit_price)
      VALUES (?, ?, ?, ?, ?)
    `);

    for (const d of reservedDetails) {
      insertItem.run(
        `ritem-${crypto.randomUUID()}`,
        reservationId,
        d.ticketTierId,
        d.quantity,
        d.unitPrice
      );
    }

    // Audit log
    db.prepare(`
      INSERT INTO audit_logs (id, actor_id, action, entity_type, entity_id, metadata, created_at)
      VALUES (?, ?, 'RESERVATION_CREATED', 'RESERVATION', ?, ?, ?)
    `).run(
      crypto.randomUUID(),
      attendeeId,
      reservationId,
      JSON.stringify({ items: reservedDetails.map(i => ({ tier: i.tierName, qty: i.quantity })) }),
      now.toISOString()
    );

    db.exec('COMMIT');

    // Invalidate public event caches so remaining availability reflects immediate holds
    cache.invalidatePattern('events:');

    const fees = Math.round(subtotal * 0.05); // Standard 5% platform fee

    return {
      reservationId,
      expiresAt,
      expiresInSeconds: 600,
      subtotal,
      fees,
      totalAmount: subtotal + fees,
      items: reservedDetails,
      event: eventInfo,
    };
  } catch (err) {
    try { db.exec('ROLLBACK'); } catch {}
    throw err;
  }
}

/**
 * Explicitly release a reservation early
 */
export function releaseReservation(reservationId: string, attendeeId: string): boolean {
  db.exec('BEGIN IMMEDIATE');
  try {
    const reservation = db.prepare(`
      SELECT id, attendee_id, status FROM reservations WHERE id = ?
    `).get(reservationId) as { id: string; attendee_id: string; status: string } | undefined;

    if (!reservation) {
      throw new Error('Reservation not found.');
    }

    if (reservation.attendee_id !== attendeeId) {
      throw new Error('Unauthorized. You can only release your own reservations.');
    }

    if (reservation.status !== 'HELD' && reservation.status !== 'PAYMENT_PENDING') {
      db.exec('ROLLBACK');
      return false; // Already finalized, expired, or released
    }

    const now = new Date().toISOString();

    db.prepare(`
      UPDATE reservations SET status = 'RELEASED', updated_at = ? WHERE id = ?
    `).run(now, reservationId);

    const items = db.prepare(`
      SELECT ticket_tier_id, quantity FROM reservation_items WHERE reservation_id = ?
    `).all(reservationId) as Array<{ ticket_tier_id: string; quantity: number }>;

    for (const item of items) {
      db.prepare(`
        UPDATE ticket_tiers
        SET reserved_quantity = reserved_quantity - ?,
            available_quantity = available_quantity + ?,
            updated_at = ?
        WHERE id = ? AND reserved_quantity >= ?
      `).run(item.quantity, item.quantity, now, item.ticket_tier_id, item.quantity);
    }

    db.exec('COMMIT');
    cache.invalidatePattern('events:');
    return true;
  } catch (err) {
    try { db.exec('ROLLBACK'); } catch {}
    throw err;
  }
}

/**
 * Get detailed summary of reservation
 */
export function getReservationSummary(reservationId: string): CreateReservationResult {
  const res = db.prepare(`
    SELECT r.id, r.status, r.expires_at, r.created_at, r.attendee_id
    FROM reservations r
    WHERE r.id = ?
  `).get(reservationId) as any;

  if (!res) {
    throw new Error('Reservation not found.');
  }

  const items = db.prepare(`
    SELECT ri.ticket_tier_id, ri.quantity, ri.unit_price, tt.name as tier_name,
           tt.available_quantity, e.id as event_id, e.title as event_title, e.poster_url as event_poster, e.start_at as event_start
    FROM reservation_items ri
    JOIN ticket_tiers tt ON tt.id = ri.ticket_tier_id
    JOIN events e ON e.id = tt.event_id
    WHERE ri.reservation_id = ?
  `).all(reservationId) as any[];

  let subtotal = 0;
  const detailedItems = items.map((it) => {
    subtotal += it.unit_price * it.quantity;
    return {
      ticketTierId: it.ticket_tier_id,
      tierName: it.tier_name,
      quantity: it.quantity,
      unitPrice: it.unit_price,
      remainingAvailable: it.available_quantity,
    };
  });

  const nowMs = Date.now();
  const expiresMs = new Date(res.expires_at).getTime();
  const expiresInSeconds = Math.max(0, Math.floor((expiresMs - nowMs) / 1000));
  const fees = Math.round(subtotal * 0.05);

  return {
    reservationId: res.id,
    expiresAt: res.expires_at,
    expiresInSeconds,
    subtotal,
    fees,
    totalAmount: subtotal + fees,
    items: detailedItems,
    event: {
      id: items[0]?.event_id || '',
      title: items[0]?.event_title || 'Event',
      posterUrl: items[0]?.event_poster || '',
      startAt: items[0]?.event_start || '',
    },
  };
}
