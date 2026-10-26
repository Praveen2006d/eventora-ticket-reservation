# Eventora Testing Guide & Concurrency Validation

## Test Suites

Eventora includes multiple testing layers:
1. **Unit & Concurrency Tests**: Written with Node.js built-in test runner (`node:test`, `node:assert/strict`) executed via `npx --yes tsx --test`.
2. **Postman API Collection**: Automated integration test collection covering auth, RBAC, reservations, expiration, payments, and admin moderation.
3. **Playwright E2E UI Tests**: Browser automation testing key attendee, organizer, and admin journeys.

## Running Automated Concurrency Tests
Run:
```bash
npm test
# or:
npx --yes tsx --test tests/concurrency.test.ts
```

### Required Concurrency Scenarios Tested:
- **Test A: 50 Concurrent Requests on 10 Inventory**:
  50 simultaneous reservation requests attempt to claim 1 ticket each on a tier with 10 total capacity.
  *Assertion*: Exactly 10 succeed (`HTTP 201`), exactly 40 fail (`HTTP 409 Conflict`), available quantity is exactly 0, reserved quantity is exactly 10, available quantity never drops below 0.
- **Test B: 20 Simultaneous Requests on 1 Inventory**:
  20 simultaneous requests compete for the last ticket.
  *Assertion*: Exactly 1 reservation succeeds, 19 receive conflict errors.
- **Test C: Multiple Expiration Workers on Same Hold**:
  Simulates two expiration workers executing simultaneously on an expired hold.
  *Assertion*: Inventory is released exactly once; no double-increment or corrupted stock.
- **Test D: Duplicate Payment Callback**:
  Submits duplicate payment confirmation events with identical references.
  *Assertion*: Order transitions to confirmed once, tickets generated once, ticket codes unique.
- **Test E: Concurrent Checkout with Same Idempotency Key**:
  Sends simultaneous checkouts with the same idempotency key.
  *Assertion*: Identical order returned without duplicate transaction or ticket records.
