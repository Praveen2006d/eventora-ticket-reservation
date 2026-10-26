# Eventora — Multi-Tenant Event & Ticket Reservation System

Eventora is a production-grade, multi-tenant event management and high-concurrency ticket reservation platform engineered with row-level database locking, 10-minute temporary inventory holds, asynchronous payment simulation, and multi-tenant role-based access control (Admin, Organizer, Attendee).

---

## Key Capabilities & Architecture

- **High-Concurrency Atomic Reservation Engine**:
  - Implements row-level conditional locking to ensure that even under massive concurrent surges (e.g. 500 simultaneous requests for 100 tickets), available inventory never becomes negative ($available \ge 0$) and tickets are never oversold.
  - Strict 10-minute hold window with monotonic inventory transitions:
    $$\text{AVAILABLE} \longrightarrow \text{HELD} \longrightarrow \text{PAYMENT\_PENDING} \longrightarrow \text{CONFIRMED}$$
  - Dual-layer hold expiration: Background reconciliation worker + just-in-time checkout validation.
- **Multi-Tenant Isolation & RBAC**:
  - **ADMIN**: Platform-wide health analytics, user moderation (activate/suspend), event status moderation, audit log review, and live concurrency benchmarking.
  - **ORGANIZER**: Complete event authoring, venue assignment, ticket tier pricing/capacity management, publish/unpublish workflow, attendee list with CSV export, and tenant-isolated revenue/conversion analytics.
  - **ATTENDEE**: Event discovery, multi-filter search, 10-minute ticket reservation, mock checkout simulation, order history, and cryptographically verified QR ticket download.
- **Asynchronous Payment Simulator**:
  - Decoupled payment processing queue simulating gateway round-trips.
  - Deterministic development modes: `APPROVE`, `DECLINE`, `TIMEOUT`.
  - Idempotency key protection prevents duplicate payments, multiple charges, or duplicate ticket issuance.
- **Cache-Aside Architecture**:
  - Namespaced Redis caching (`events:published:{queryHash}`, `event:{id}`).
  - Instant cache invalidation on event mutations and inventory updates.
  - In-memory fallback if Redis is temporarily unreachable.
- **QR Code Verification & Door Check-In**:
  - Each confirmed admission generates a unique ticket code and HMAC-signed QR payload.
  - Door staff can scan or enter ticket codes to authenticate and mark check-in (`VALID` $\to$ `CHECKED_IN`).

---

## Technology Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS, Lucide Icons, QR Code generation, Canvas Confetti.
- **Backend**: Node.js 22, Express, TypeScript, REST API v1.
- **Database & Concurrency**: PostgreSQL 16 (production) with Prisma ORM; dual-engine support with embedded ACID transactional SQLite for zero-setup execution.
- **Queues & Cache**: Redis 7, BullMQ, and in-process reconciliation engine.
- **Testing**: Node.js Test Runner (`node:test`, `node:assert/strict`), Playwright E2E automation, Postman Collection.

---

## Quickstart & Local Development

### 1. Prerequisites
- Node.js >= 20 (Node 22 recommended)
- npm >= 9

### 2. Installation
```bash
git clone https://github.com/your-org/eventora.git
cd eventora
npm install
```

### 3. Running Dev Server (Full Stack)
```bash
npm run dev
```
Open **http://localhost:3000** to explore the complete interactive frontend and API.

### 4. Running Concurrency & Integration Tests
```bash
npm test
# Or directly via tsx:
npx tsx --test tests/concurrency.test.ts
```

All 5 core concurrency and idempotency tests execute in milliseconds:
- **Test A**: 50 concurrent requests on 10 tickets $\to$ exactly 10 succeed, 40 conflict (HTTP 409).
- **Test B**: 20 simultaneous requests on 1 ticket $\to$ exactly 1 succeeds.
- **Test C**: Multi-worker hold expiration $\to$ inventory released exactly once, status becomes EXPIRED.
- **Test D**: Duplicate payment callbacks $\to$ idempotently confirmed, zero duplicate tickets.
- **Test E**: Concurrent checkout with same idempotency key $\to$ returns identical order without duplication.

---

## Default Seed Test Accounts

| Role | Email | Password | Persona |
| :--- | :--- | :--- | :--- |
| **ADMIN** | `admin@eventora.com` | `AdminPass123!` | Eleanor Vance (Platform Administrator) |
| **ORGANIZER** | `apex@events.com` | `OrganizerPass123!` | Marcus Sterling (Apex Live Productions) |
| **ORGANIZER** | `soundwave@festivals.com` | `OrganizerPass123!` | Chloe Davenport (Soundwave Experiences) |
| **ATTENDEE** | `sarah.chen@example.com` | `AttendeePass123!` | Sarah Chen |
| **ATTENDEE** | `alex.miller@example.com` | `AttendeePass123!` | Alex Miller |

---

## Docker Deployment (PostgreSQL + Redis + API + Worker + Web)

To run the complete distributed multi-container stack:
```bash
docker compose up -d --build
```
This spins up:
- `eventora-postgres`: Port `5432`
- `eventora-redis`: Port `6379`
- `eventora-api`: Port `4000`
- `eventora-worker`: BullMQ worker processing background jobs
- `eventora-web`: Port `3000` (Nginx serving frontend)

---

## Documentation Links
- [Entity-Relationship Diagram](docs/ER-DIAGRAM.md)
- [REST API Specification](docs/API.md)
- [System Architecture](docs/ARCHITECTURE.md)
- [Deployment Guide](docs/DEPLOYMENT.md)
- [Testing & Concurrency Verification](docs/TESTING.md)
- [Postman Test Collection](postman/eventora.postman_collection.json)
