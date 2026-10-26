/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { db } from './db.ts';
import { cache } from './cache.ts';
import { reclaimExpiredHolds } from './reservationEngine.ts';
import crypto from 'node:crypto';

export interface CheckoutRequest {
  reservationId: string;
  outcomeSimulation?: 'APPROVE' | 'DECLINE' | 'TIMEOUT';
  idempotencyKey?: string;
}

export interface CheckoutResponse {
  orderId: string;
  orderNumber: string;
  transactionId: string;
  status: 'PENDING' | 'CONFIRMED' | 'FAILED';
  paymentStatus: 'PENDING' | 'APPROVED' | 'DECLINED' | 'TIMED_OUT';
  totalAmount: number;
  currency: string;
  tickets?: Array<{
    ticketCode: string;
    tierName: string;
    qrCodeData: string;
  }>;
}

// In-memory queue of pending async payments for asynchronous processing
interface PaymentQueueJob {
  jobId: string;
  orderId: string;
  transactionId: string;
  reservationId: string;
  outcome: 'APPROVE' | 'DECLINE' | 'TIMEOUT';
  enqueuedAt: number;
}

const paymentQueue: PaymentQueueJob[] = [];

/**
 * Background runner that simulates payment gateway processing asynchronously
 */
export function processPendingPayments() {
  const now = Date.now();
  const jobsToProcess = [...paymentQueue];

  for (const job of jobsToProcess) {
    // Simulate 1.2 second processing latency
    if (now - job.enqueuedAt < 1200) {
      continue;
    }

    // Remove from queue
    const index = paymentQueue.findIndex((j) => j.jobId === job.jobId);
    if (index !== -1) {
      paymentQueue.splice(index, 1);
    }

    finalizePaymentOutcome(job.orderId, job.transactionId, job.reservationId, job.outcome);
  }
}

/**
 * Finalizes payment transaction outcome atomically in database
 */
export function finalizePaymentOutcome(
  orderId: string,
  transactionId: string,
  reservationId: string,
  outcome: 'APPROVE' | 'DECLINE' | 'TIMEOUT'
) {
  const timestamp = new Date().toISOString();

  db.exec('BEGIN IMMEDIATE');

  try {
    const order = db.prepare('SELECT id, status, attendee_id FROM orders WHERE id = ?').get(orderId) as any;
    const tx = db.prepare('SELECT id, status FROM payment_transactions WHERE id = ?').get(transactionId) as any;

    if (!order || !tx || tx.status !== 'PENDING') {
      db.exec('ROLLBACK');
      return; // Already resolved
    }

    if (outcome === 'APPROVE') {
      // 1. Mark transaction APPROVED
      const providerRef = `SIM_PAY_${crypto.randomBytes(8).toString('hex').toUpperCase()}`;
      db.prepare(`
        UPDATE payment_transactions
        SET status = 'APPROVED', provider_reference = ?, updated_at = ?
        WHERE id = ?
      `).run(providerRef, timestamp, transactionId);

      // 2. Mark order CONFIRMED
      db.prepare(`
        UPDATE orders
        SET status = 'CONFIRMED', updated_at = ?
        WHERE id = ?
      `).run(timestamp, orderId);

      // 3. Mark reservation CONFIRMED
      db.prepare(`
        UPDATE reservations
        SET status = 'CONFIRMED', updated_at = ?
        WHERE id = ?
      `).run(timestamp, reservationId);

      // 4. Transfer reserved inventory -> sold inventory
      const orderItems = db.prepare(`
        SELECT oi.id as order_item_id, oi.ticket_tier_id, oi.quantity, tt.event_id, tt.name as tier_name, e.title as event_title
        FROM order_items oi
        JOIN ticket_tiers tt ON tt.id = oi.ticket_tier_id
        JOIN events e ON e.id = tt.event_id
        WHERE oi.order_id = ?
      `).all(orderId) as any[];

      for (const item of orderItems) {
        db.prepare(`
          UPDATE ticket_tiers
          SET reserved_quantity = reserved_quantity - ?,
              sold_quantity = sold_quantity + ?,
              updated_at = ?
          WHERE id = ? AND reserved_quantity >= ?
        `).run(item.quantity, item.quantity, timestamp, item.ticket_tier_id, item.quantity);

        // 5. Issue unique tickets (1 per admission)
        for (let i = 0; i < item.quantity; i++) {
          const shortRand = crypto.randomBytes(3).toString('hex').toUpperCase();
          const ticketCode = `EVT-${item.event_id.substring(4, 8).toUpperCase()}-${shortRand}`;
          const signature = crypto
            .createHmac('sha256', 'eventora-ticket-signing-secret')
            .update(`${ticketCode}:${item.event_id}:${order.attendee_id}`)
            .digest('hex')
            .substring(0, 16);

          const qrData = JSON.stringify({
            ticketCode,
            eventId: item.event_id,
            tier: item.tier_name,
            attendeeId: order.attendee_id,
            sig: signature,
          });

          db.prepare(`
            INSERT INTO tickets (id, order_item_id, attendee_id, event_id, ticket_code, qr_code_data, status, issued_at)
            VALUES (?, ?, ?, ?, ?, ?, 'VALID', ?)
          `).run(
            `tkt-${crypto.randomUUID()}`,
            item.order_item_id,
            order.attendee_id,
            item.event_id,
            ticketCode,
            qrData,
            timestamp
          );
        }
      }

      // Audit log
      db.prepare(`
        INSERT INTO audit_logs (id, actor_id, action, entity_type, entity_id, metadata, created_at)
        VALUES (?, ?, 'PAYMENT_APPROVED', 'ORDER', ?, ?, ?)
      `).run(
        crypto.randomUUID(),
        order.attendee_id,
        orderId,
        JSON.stringify({ providerReference: providerRef, status: 'CONFIRMED' }),
        timestamp
      );
    } else {
      // DECLINE or TIMEOUT
      const failStatus = outcome === 'TIMEOUT' ? 'TIMED_OUT' : 'DECLINED';
      const failReason = outcome === 'TIMEOUT' ? 'Mock payment gateway timed out.' : 'Simulated payment was declined by issuing bank.';

      db.prepare(`
        UPDATE payment_transactions
        SET status = ?, failure_reason = ?, updated_at = ?
        WHERE id = ?
      `).run(failStatus, failReason, timestamp, transactionId);

      db.prepare(`
        UPDATE orders
        SET status = 'FAILED', updated_at = ?
        WHERE id = ?
      `).run(timestamp, orderId);

      // Release reserved inventory back to available stock
      const orderItems = db.prepare(`
        SELECT ticket_tier_id, quantity FROM order_items WHERE order_id = ?
      `).all(orderId) as any[];

      for (const item of orderItems) {
        db.prepare(`
          UPDATE ticket_tiers
          SET reserved_quantity = reserved_quantity - ?,
              available_quantity = available_quantity + ?,
              updated_at = ?
          WHERE id = ? AND reserved_quantity >= ?
        `).run(item.quantity, item.quantity, timestamp, item.ticket_tier_id, item.quantity);
      }

      db.prepare(`
        UPDATE reservations SET status = 'RELEASED', updated_at = ? WHERE id = ?
      `).run(timestamp, reservationId);

      // Audit log
      db.prepare(`
        INSERT INTO audit_logs (id, actor_id, action, entity_type, entity_id, metadata, created_at)
        VALUES (?, ?, 'PAYMENT_FAILED', 'ORDER', ?, ?, ?)
      `).run(
        crypto.randomUUID(),
        order.attendee_id,
        orderId,
        JSON.stringify({ status: failStatus, reason: failReason }),
        timestamp
      );
    }

    db.exec('COMMIT');
    cache.invalidatePattern('events:');
  } catch (err) {
    try { db.exec('ROLLBACK'); } catch {}
    console.error(`[PaymentService] Error finalizing payment for order ${orderId}:`, err);
  }
}

/**
 * Initiates checkout for an active reservation
 */
export function checkoutReservation(
  attendeeId: string,
  data: CheckoutRequest
): CheckoutResponse {
  const { reservationId, outcomeSimulation = 'APPROVE' } = data;
  const idempotencyKey = data.idempotencyKey || `idem-${crypto.randomUUID()}`;

  // Check idempotency first: If a payment transaction already exists with this key, return it
  const existingTx = db.prepare(`
    SELECT pt.id as transaction_id, pt.status as payment_status, pt.amount, pt.currency,
           o.id as order_id, o.order_number, o.status as order_status
    FROM payment_transactions pt
    JOIN orders o ON o.id = pt.order_id
    WHERE pt.idempotency_key = ?
  `).get(idempotencyKey) as any;

  if (existingTx) {
    const tickets = db.prepare(`
      SELECT t.ticket_code, tt.name as tier_name, t.qr_code_data
      FROM tickets t
      JOIN order_items oi ON oi.id = t.order_item_id
      JOIN ticket_tiers tt ON tt.id = oi.ticket_tier_id
      WHERE oi.order_id = ?
    `).all(existingTx.order_id) as any[];

    return {
      orderId: existingTx.order_id,
      orderNumber: existingTx.order_number,
      transactionId: existingTx.transaction_id,
      status: existingTx.order_status,
      paymentStatus: existingTx.payment_status,
      totalAmount: existingTx.amount,
      currency: existingTx.currency,
      tickets: tickets.map((t) => ({
        ticketCode: t.ticket_code,
        tierName: t.tier_name,
        qrCodeData: t.qr_code_data,
      })),
    };
  }

  // 1. Reclaim any expired holds system-wide
  reclaimExpiredHolds();

  // 2. Fetch reservation with verification
  const res = db.prepare(`
    SELECT r.id, r.attendee_id, r.status, r.expires_at
    FROM reservations r
    WHERE r.id = ?
  `).get(reservationId) as any;

  if (!res) {
    throw new Error('Reservation not found.');
  }

  if (res.attendee_id !== attendeeId) {
    throw new Error('Unauthorized. You do not own this reservation.');
  }

  if (res.status !== 'HELD' && res.status !== 'PAYMENT_PENDING') {
    throw new Error(`Reservation is not active. Current status: ${res.status}`);
  }

  const now = new Date();
  if (new Date(res.expires_at).getTime() <= now.getTime()) {
    throw new Error('Reservation hold time has expired. Please select tickets again.');
  }

  // Calculate authoritative amount from authoritative DB records
  const items = db.prepare(`
    SELECT ri.ticket_tier_id, ri.quantity, tt.price, tt.name as tier_name
    FROM reservation_items ri
    JOIN ticket_tiers tt ON tt.id = ri.ticket_tier_id
    WHERE ri.reservation_id = ?
  `).all(reservationId) as any[];

  if (items.length === 0) {
    throw new Error('No items in reservation.');
  }

  let subtotal = 0;
  for (const it of items) {
    subtotal += it.price * it.quantity;
  }
  const fees = Math.round(subtotal * 0.05);
  const totalAmount = subtotal + fees;

  const orderId = `ord-${crypto.randomUUID()}`;
  const transactionId = `tx-${crypto.randomUUID()}`;
  const randomSuffix = Math.floor(100000 + Math.random() * 900000);
  const orderNumber = `ORD-2026-${randomSuffix}`;

  db.exec('BEGIN IMMEDIATE');

  try {
    // Transition reservation to PAYMENT_PENDING
    db.prepare(`
      UPDATE reservations SET status = 'PAYMENT_PENDING', updated_at = ? WHERE id = ?
    `).run(now.toISOString(), reservationId);

    // Create Order
    db.prepare(`
      INSERT INTO orders (id, attendee_id, reservation_id, order_number, subtotal, fees, total_amount, currency, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'INR', 'PENDING', ?, ?)
    `).run(
      orderId,
      attendeeId,
      reservationId,
      orderNumber,
      subtotal,
      fees,
      totalAmount,
      now.toISOString(),
      now.toISOString()
    );

    // Create Order Items
    const insertOrderItem = db.prepare(`
      INSERT INTO order_items (id, order_id, ticket_tier_id, quantity, unit_price)
      VALUES (?, ?, ?, ?, ?)
    `);

    for (const it of items) {
      insertOrderItem.run(
        `oitem-${crypto.randomUUID()}`,
        orderId,
        it.ticket_tier_id,
        it.quantity,
        it.price
      );
    }

    // Create Payment Transaction (status PENDING)
    db.prepare(`
      INSERT INTO payment_transactions (id, order_id, provider, amount, currency, status, idempotency_key, created_at, updated_at)
      VALUES (?, ?, 'EVENTORA_MOCK_GATEWAY', ?, 'INR', 'PENDING', ?, ?, ?)
    `).run(
      transactionId,
      orderId,
      totalAmount,
      idempotencyKey,
      now.toISOString(),
      now.toISOString()
    );

    db.exec('COMMIT');

    // Enqueue for asynchronous simulation processing
    paymentQueue.push({
      jobId: `job-${crypto.randomUUID()}`,
      orderId,
      transactionId,
      reservationId,
      outcome: outcomeSimulation,
      enqueuedAt: Date.now(),
    });

    return {
      orderId,
      orderNumber,
      transactionId,
      status: 'PENDING',
      paymentStatus: 'PENDING',
      totalAmount,
      currency: 'INR',
    };
  } catch (err) {
    try { db.exec('ROLLBACK'); } catch {}
    throw err;
  }
}

/**
 * Get status of payment transaction and order
 */
export function getPaymentStatus(transactionIdOrOrderId: string) {
  const record = db.prepare(`
    SELECT pt.id as transaction_id, pt.status as payment_status, pt.amount, pt.currency, pt.provider_reference, pt.failure_reason,
           o.id as order_id, o.order_number, o.status as order_status, o.created_at, e.title as event_title, e.id as event_id
    FROM payment_transactions pt
    JOIN orders o ON o.id = pt.order_id
    LEFT JOIN order_items oi ON oi.order_id = o.id
    LEFT JOIN ticket_tiers tt ON tt.id = oi.ticket_tier_id
    LEFT JOIN events e ON e.id = tt.event_id
    WHERE pt.id = ? OR o.id = ?
    LIMIT 1
  `).get(transactionIdOrOrderId, transactionIdOrOrderId) as any;

  if (!record) {
    throw new Error('Payment transaction or order not found.');
  }

  // Fetch issued tickets if confirmed
  let tickets: any[] = [];
  if (record.order_status === 'CONFIRMED') {
    const rawTickets = db.prepare(`
      SELECT t.id, t.ticket_code, t.qr_code_data, t.status, t.issued_at,
             tt.name as tier_name, e.title as event_title, v.name as venue_name, e.start_at as event_date
      FROM tickets t
      JOIN order_items oi ON oi.id = t.order_item_id
      JOIN ticket_tiers tt ON tt.id = oi.ticket_tier_id
      JOIN events e ON e.id = t.event_id
      JOIN venues v ON v.id = e.venue_id
      WHERE oi.order_id = ?
    `).all(record.order_id) as any[];

    tickets = rawTickets.map((t) => ({
      id: t.id,
      ticketCode: t.ticket_code,
      qrCodeData: t.qr_code_data,
      status: t.status,
      issuedAt: t.issued_at,
      tierName: t.tier_name,
      eventTitle: t.event_title,
      venueName: t.venue_name,
      eventDate: t.event_date,
    }));
  }

  return {
    orderId: record.order_id,
    orderNumber: record.order_number,
    transactionId: record.transaction_id,
    status: record.order_status,
    paymentStatus: record.payment_status,
    providerReference: record.provider_reference,
    failureReason: record.failure_reason,
    totalAmount: record.amount,
    currency: record.currency,
    eventTitle: record.event_title,
    eventId: record.event_id,
    tickets,
  };
}

// Background scheduler running every 3 seconds to process async queue and reclaim expired holds
const backgroundWorkerInterval = setInterval(() => {
  try {
    processPendingPayments();
    reclaimExpiredHolds();
  } catch (err) {
    console.error('[WorkerLoop] Background task error:', err);
  }
}, 3000);

// Unref timer so node process/tests can exit cleanly when idle
if (backgroundWorkerInterval.unref) {
  backgroundWorkerInterval.unref();
}
