# Eventora System Architecture

## Architectural Principles
1. **Database as Authoritative Source of Truth**: Inventory accounting and locks occur at the database layer using strict row-level transactions. Caches (Redis) are strictly read-through / cache-aside and never authoritatively govern checkout or inventory.
2. **Deterministic Monotonic Accounting**:
   - Holding: $\text{available} \gets \text{available} - q, \quad \text{reserved} \gets \text{reserved} + q$
   - Confirming: $\text{reserved} \gets \text{reserved} - q, \quad \text{sold} \gets \text{sold} + q$
   - Expiring / Releasing: $\text{reserved} \gets \text{reserved} - q, \quad \text{available} \gets \text{available} + q$
   - Invariant: $\text{available} \ge 0 \land \text{reserved} \ge 0 \land \text{sold} \ge 0 \land \text{available} + \text{reserved} + \text{sold} = \text{total}$
3. **Double-Layer Expiration Protection**:
   - **Layer 1 (Background Worker)**: Active worker (BullMQ / Cron) queries expired reservations (`status = 'HELD' AND expiresAt <= NOW()`) and releases inventory.
   - **Layer 2 (Just-In-Time Guard)**: Whenever checkout is attempted or inventory is queried, expired holds are checked and reclaimed atomically before processing. This prevents delayed workers from permitting checkout on stale holds.
4. **Tenant Isolation**:
   - Every organizer endpoint enforces `event.organizerId === currentOrganizer.id`.
   - Admin roles bypass tenant bounds strictly for platform moderation and audit logs.
5. **Asynchronous Payment Simulation**:
   - Decoupled payment processing queue with state machine (`PENDING` -> `PROCESSING` -> `APPROVED` | `DECLINED` | `TIMED_OUT`).
   - Idempotency key tracking on orders and payment transactions guarantees duplicate network requests or retries cannot cause multiple charges or duplicate ticket issuance.
6. **Graceful Degraded Runtime**:
   - When deployed with PostgreSQL and Redis, Eventora utilizes Prisma transactions with `SELECT FOR UPDATE` and BullMQ Redis queues.
   - When running in zero-dependency container environments, the engine seamlessly switches to embedded ACID SQLite storage and an in-process precision scheduler while maintaining 100% of the API contracts, status codes, and concurrency safeguards.

## Component Architecture

```
[ Client: React SPA / Mobile Web ]
            │ HTTP / Cookies / JWT
            ▼
┌──────────────────────────────────────────────┐
│           Express REST API Gateway           │
│  - Rate Limiter & Security Headers           │
│  - Authentication & RBAC Middleware          │
│  - Request ID & Audit Logger                 │
└───────┬──────────────┬───────────────┬───────┘
        │              │               │
        ▼              ▼               ▼
┌──────────────┐┌──────────────┐┌──────────────┐
│ Event Engine ││ Reservations ││ Payment &    │
│ & Discovery  ││ Atomic Holds ││ Order Engine │
└───────┬──────┘└──────┬───────┘└──────┬───────┘
        │              │               │
        ├──────────────┴───────────────┤
        ▼                              ▼
┌──────────────┐               ┌──────────────┐
│ Redis Cache  │               │ Database     │
│ (Cache-aside)│               │ (Postgres /  │
│              │               │  ACID Engine)│
└──────────────┘               └───────▲──────┘
                                       │
                               ┌───────┴──────┐
                               │ Background   │
                               │ Worker       │
                               │ (Reconciler/ │
                               │  BullMQ)     │
                               └──────────────┘
```
