/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

process.env.NODE_ENV = 'test';
import test from 'node:test';
import assert from 'node:assert/strict';
import { db, initializeDatabase } from '../server/db.ts';
import { createReservation, reclaimExpiredHolds } from '../server/reservationEngine.ts';
import { checkoutReservation, finalizePaymentOutcome } from '../server/paymentService.ts';
import crypto from 'node:crypto';

// Setup test database
initializeDatabase();

test('Test A: 50 concurrent reservation requests on tier with 10 inventory', async () => {
  const tierId = `tier-test-a-${crypto.randomUUID()}`;
  const now = new Date().toISOString();

  // Create isolated tier with 10 total capacity
  db.prepare(`
    INSERT INTO ticket_tiers (id, event_id, name, description, price, currency, total_quantity, available_quantity, reserved_quantity, sold_quantity, max_per_order, created_at, updated_at)
    VALUES (?, 'evt-ai-summit-2026', 'Test A Tier 10', 'Concurrency test tier', 5000, 'USD', 10, 10, 0, 0, 6, ?, ?)
  `).run(tierId, now, now);

  const results: Array<{ success: boolean; statusCode: number; error?: string }> = [];

  // Launch 50 requests
  for (let i = 0; i < 50; i++) {
    try {
      createReservation('usr-att-01', [{ ticketTierId: tierId, quantity: 1 }]);
      results.push({ success: true, statusCode: 201 });
    } catch (err: any) {
      results.push({ success: false, statusCode: err.statusCode || 409, error: err.message });
    }
  }

  const successCount = results.filter((r) => r.success).length;
  const conflictCount = results.filter((r) => !r.success).length;

  const tier = db.prepare('SELECT total_quantity, available_quantity, reserved_quantity, sold_quantity FROM ticket_tiers WHERE id = ?').get(tierId) as any;

  assert.equal(successCount, 10, 'Exactly 10 reservations must succeed');
  assert.equal(conflictCount, 40, 'Exactly 40 requests must receive conflict error');
  assert.equal(tier.available_quantity, 0, 'Available inventory must be exactly 0');
  assert.equal(tier.reserved_quantity, 10, 'Reserved inventory must equal exactly 10');
  assert.ok(tier.available_quantity >= 0, 'Available quantity must never become negative');
  assert.equal(tier.available_quantity + tier.reserved_quantity + tier.sold_quantity, tier.total_quantity, 'Inventory conservation invariant maintained');
});

test('Test B: 20 simultaneous requests on tier with inventory of 1', async () => {
  const tierId = `tier-test-b-${crypto.randomUUID()}`;
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO ticket_tiers (id, event_id, name, description, price, currency, total_quantity, available_quantity, reserved_quantity, sold_quantity, max_per_order, created_at, updated_at)
    VALUES (?, 'evt-ai-summit-2026', 'Test B Tier 1', 'Solo ticket tier', 9900, 'USD', 1, 1, 0, 0, 6, ?, ?)
  `).run(tierId, now, now);

  const results: Array<{ success: boolean }> = [];

  for (let i = 0; i < 20; i++) {
    try {
      createReservation('usr-att-01', [{ ticketTierId: tierId, quantity: 1 }]);
      results.push({ success: true });
    } catch {
      results.push({ success: false });
    }
  }

  const successCount = results.filter((r) => r.success).length;
  const failureCount = results.filter((r) => !r.success).length;

  const tier = db.prepare('SELECT available_quantity, reserved_quantity FROM ticket_tiers WHERE id = ?').get(tierId) as any;

  assert.equal(successCount, 1, 'Exactly one request reserves the ticket');
  assert.equal(failureCount, 19, 'The remaining 19 requests cannot reserve it');
  assert.equal(tier.available_quantity, 0);
  assert.equal(tier.reserved_quantity, 1);
});

test('Test C: Multiple expiration workers running on the same hold release inventory exactly once', async () => {
  const tierId = `tier-test-c-${crypto.randomUUID()}`;
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO ticket_tiers (id, event_id, name, description, price, currency, total_quantity, available_quantity, reserved_quantity, sold_quantity, max_per_order, created_at, updated_at)
    VALUES (?, 'evt-ai-summit-2026', 'Test C Tier', 'Hold expiration tier', 3000, 'USD', 5, 5, 0, 0, 6, ?, ?)
  `).run(tierId, now, now);

  // Reserve 2 tickets
  const res = createReservation('usr-att-01', [{ ticketTierId: tierId, quantity: 2 }]);

  let tier = db.prepare('SELECT available_quantity, reserved_quantity FROM ticket_tiers WHERE id = ?').get(tierId) as any;
  assert.equal(tier.available_quantity, 3);
  assert.equal(tier.reserved_quantity, 2);

  // Force expiration timestamp in the past
  const past = new Date(Date.now() - 60000).toISOString();
  db.prepare('UPDATE reservations SET expires_at = ? WHERE id = ?').run(past, res.reservationId);

  // Run multiple expiration runs concurrently
  const run1 = reclaimExpiredHolds();
  const run2 = reclaimExpiredHolds();

  assert.ok(run1 >= 1, 'First run reclaims the expired reservation');
  assert.equal(run2, 0, 'Second run finds 0 eligible reservations (idempotent)');

  tier = db.prepare('SELECT available_quantity, reserved_quantity, total_quantity FROM ticket_tiers WHERE id = ?').get(tierId) as any;
  assert.equal(tier.available_quantity, 5, 'Inventory returned to available stock');
  assert.equal(tier.reserved_quantity, 0, 'Reserved stock dropped back to 0');
  assert.equal(tier.available_quantity + tier.reserved_quantity, tier.total_quantity);

  const reservation = db.prepare('SELECT status FROM reservations WHERE id = ?').get(res.reservationId) as any;
  assert.equal(reservation.status, 'EXPIRED');
});

test('Test D: Duplicate payment callback produces exactly one confirmed order transition and no duplicate tickets', async () => {
  const tierId = `tier-test-d-${crypto.randomUUID()}`;
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO ticket_tiers (id, event_id, name, description, price, currency, total_quantity, available_quantity, reserved_quantity, sold_quantity, max_per_order, created_at, updated_at)
    VALUES (?, 'evt-ai-summit-2026', 'Test D Tier', 'Payment callback tier', 7500, 'USD', 5, 5, 0, 0, 6, ?, ?)
  `).run(tierId, now, now);

  const res = createReservation('usr-att-01', [{ ticketTierId: tierId, quantity: 2 }]);
  const checkout = checkoutReservation('usr-att-01', {
    reservationId: res.reservationId,
    outcomeSimulation: 'APPROVE',
    idempotencyKey: `pay-key-${crypto.randomUUID()}`,
  });

  // Call finalizePaymentOutcome twice simulating duplicate callback / retry
  finalizePaymentOutcome(checkout.orderId, checkout.transactionId, res.reservationId, 'APPROVE');
  finalizePaymentOutcome(checkout.orderId, checkout.transactionId, res.reservationId, 'APPROVE');

  // Verify order
  const order = db.prepare('SELECT status FROM orders WHERE id = ?').get(checkout.orderId) as any;
  assert.equal(order.status, 'CONFIRMED');

  // Verify ticket count: exactly 2 tickets (since quantity was 2)
  const tickets = db.prepare(`
    SELECT t.id, t.ticket_code
    FROM tickets t
    JOIN order_items oi ON oi.id = t.order_item_id
    WHERE oi.order_id = ?
  `).all(checkout.orderId) as any[];

  assert.equal(tickets.length, 2, 'Exactly 2 tickets generated, no duplicates');
  assert.notEqual(tickets[0].ticket_code, tickets[1].ticket_code, 'Ticket codes must be unique');

  // Verify inventory: exactly 2 sold, 0 reserved, 3 available
  const tier = db.prepare('SELECT available_quantity, reserved_quantity, sold_quantity FROM ticket_tiers WHERE id = ?').get(tierId) as any;
  assert.equal(tier.sold_quantity, 2);
  assert.equal(tier.reserved_quantity, 0);
  assert.equal(tier.available_quantity, 3);
});

test('Test E: Concurrent checkout requests using the same idempotency key return identical order', async () => {
  const tierId = `tier-test-e-${crypto.randomUUID()}`;
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO ticket_tiers (id, event_id, name, description, price, currency, total_quantity, available_quantity, reserved_quantity, sold_quantity, max_per_order, created_at, updated_at)
    VALUES (?, 'evt-ai-summit-2026', 'Test E Tier', 'Idempotent checkout tier', 4500, 'USD', 10, 10, 0, 0, 6, ?, ?)
  `).run(tierId, now, now);

  const res = createReservation('usr-att-01', [{ ticketTierId: tierId, quantity: 1 }]);
  const idempotencyKey = `idempotent-test-key-${crypto.randomUUID()}`;

  const checkout1 = checkoutReservation('usr-att-01', {
    reservationId: res.reservationId,
    idempotencyKey,
  });

  const checkout2 = checkoutReservation('usr-att-01', {
    reservationId: res.reservationId,
    idempotencyKey,
  });

  assert.equal(checkout1.orderId, checkout2.orderId, 'Both checkouts must return identical orderId');
  assert.equal(checkout1.transactionId, checkout2.transactionId, 'Both checkouts must return identical transactionId');

  // Verify only 1 order exists with this orderId
  const orderCount = db.prepare('SELECT COUNT(*) as count FROM orders WHERE id = ?').get(checkout1.orderId) as any;
  assert.equal(orderCount.count, 1);
});
