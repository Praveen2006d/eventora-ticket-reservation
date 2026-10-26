/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Worker, Job, Queue } from 'bullmq';
import { Redis } from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

const connection = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null,
  lazyConnect: true,
});

export const RESERVATION_EXPIRATION_QUEUE = 'reservation-expiration';
export const PAYMENT_PROCESSING_QUEUE = 'payment-processing';

export const reservationQueue = new Queue(RESERVATION_EXPIRATION_QUEUE, { connection });
export const paymentQueue = new Queue(PAYMENT_PROCESSING_QUEUE, { connection });

/**
 * Worker Job Handler for Reservation Expiration
 */
export async function handleReservationExpiration(job: Job<{ reservationId: string }>) {
  const { reservationId } = job.data;
  console.log(`[Worker] Checking hold expiration for reservation: ${reservationId}`);

  // When connecting to PostgreSQL via Prisma:
  // 1. BEGIN TRANSACTION
  // 2. SELECT * FROM "Reservation" WHERE id = $1 FOR UPDATE
  // 3. IF status === 'HELD' AND expiresAt <= NOW():
  //      UPDATE "Reservation" SET status = 'EXPIRED' WHERE id = $1
  //      FOR EACH item IN ReservationItem:
  //        UPDATE "TicketTier"
  //        SET "reservedQuantity" = "reservedQuantity" - item.quantity,
  //            "availableQuantity" = "availableQuantity" + item.quantity
  //        WHERE id = item.ticketTierId
  // 4. COMMIT
  return { released: true, reservationId };
}

/**
 * Worker Job Handler for Asynchronous Payment Processing
 */
export async function handlePaymentProcessing(job: Job<{
  orderId: string;
  transactionId: string;
  outcome: 'APPROVE' | 'DECLINE' | 'TIMEOUT';
}>) {
  const { orderId, transactionId, outcome } = job.data;
  console.log(`[Worker] Processing simulated payment for Order ${orderId}: Outcome=${outcome}`);

  // Simulates payment gateway round-trip latency
  await new Promise((resolve) => setTimeout(resolve, 1000));

  if (outcome === 'APPROVE') {
    // 1. BEGIN TRANSACTION
    // 2. UPDATE "PaymentTransaction" SET status = 'APPROVED'
    // 3. UPDATE "Order" SET status = 'CONFIRMED'
    // 4. FOR EACH OrderItem:
    //      UPDATE "TicketTier" SET "reservedQuantity" = "reservedQuantity" - item.quantity, "soldQuantity" = "soldQuantity" + item.quantity
    //      GENERATE Tickets (1 per admission) with unique ticketCode and signed QR data
    // 5. COMMIT
    return { status: 'APPROVED', orderId };
  } else {
    // 1. UPDATE "PaymentTransaction" SET status = outcome === 'TIMEOUT' ? 'TIMED_OUT' : 'DECLINED'
    // 2. UPDATE "Order" SET status = 'FAILED'
    // 3. RELEASE held inventory:
    //      UPDATE "TicketTier" SET "reservedQuantity" = "reservedQuantity" - qty, "availableQuantity" = "availableQuantity" + qty
    return { status: outcome, orderId };
  }
}

export function startWorker() {
  console.log('[Worker] Starting BullMQ workers with Redis:', REDIS_URL);

  const expirationWorker = new Worker(
    RESERVATION_EXPIRATION_QUEUE,
    handleReservationExpiration,
    { connection, concurrency: 5 }
  );

  const paymentWorker = new Worker(
    PAYMENT_PROCESSING_QUEUE,
    handlePaymentProcessing,
    { connection, concurrency: 10 }
  );

  expirationWorker.on('completed', (job) => {
    console.log(`[Worker:Expiration] Job ${job.id} completed.`);
  });

  paymentWorker.on('completed', (job) => {
    console.log(`[Worker:Payment] Job ${job.id} completed.`);
  });

  return { expirationWorker, paymentWorker };
}

if (process.env.NODE_ENV !== 'test' && !process.env.AIS_ENV) {
  startWorker();
}
