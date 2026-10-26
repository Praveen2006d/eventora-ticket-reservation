# Eventora REST API Specification

Version: v1  
Base URL: `/api/v1`

All responses follow standard JSON structures with proper HTTP status codes.

## Standard Response Format
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional human-readable description",
  "requestId": "req_8f1a2e..."
}
```

Error format:
```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_INVENTORY",
    "message": "Only 3 tickets remain available for this tier."
  },
  "requestId": "req_8f1a2e..."
}
```

---

## 1. Authentication (`/api/v1/auth`)

### POST `/api/v1/auth/register`
Creates a new account (default role: `ATTENDEE`; `ORGANIZER` requires organization details).
- **Body**: `{ name, email, password, role?: "ATTENDEE" | "ORGANIZER", organizationName?: string }`
- **Response**: `201 Created` with user details & access token.

### POST `/api/v1/auth/login`
Authenticates credentials.
- **Body**: `{ email, password }`
- **Response**: `200 OK` with user details, role, access token, and sets HttpOnly refresh cookie.

### POST `/api/v1/auth/logout`
Revokes active refresh token and clears session cookie.

### GET `/api/v1/auth/me`
Returns authenticated user profile, permissions, and active reservations count.

---

## 2. Public Events (`/api/v1/events`)

### GET `/api/v1/events`
Query parameters: `q`, `category`, `city`, `startDate`, `endDate`, `page`, `limit`.
- Returns published events with ticket tier starting prices and availability flags.
- Cached in Redis / memory cache (`events:published:{queryHash}`).

### GET `/api/v1/events/:id`
Returns event details, venue information, organizer profile, and ticket tiers.

### GET `/api/v1/events/:id/ticket-tiers`
Returns ticket tiers with real-time remaining inventory and order limits.

---

## 3. Reservations Engine (`/api/v1/reservations`)

### POST `/api/v1/reservations`
Atomically reserves ticket inventory with 10-minute hold.
- **Headers**: `Idempotency-Key: <UUID>`
- **Body**: `{ items: [{ ticketTierId: string, quantity: number }] }`
- **Concurrency Protection**: Uses row-level lock (`SELECT FOR UPDATE` in PostgreSQL / immediate atomic write transaction in SQLite). Checks $availableQuantity \ge requestedQuantity$.
- **Response**: `201 Created` with reservation ID, `expiresAt` (server epoch ms), held items, subtotal, and remaining inventory.
- **Status 409 Conflict**: Returned when available inventory is insufficient.

### GET `/api/v1/reservations/:id`
Retrieves reservation details, active countdown timer, and status.

### POST `/api/v1/reservations/:id/release`
Explicitly releases held inventory back to available stock before the 10-minute expiration.

---

## 4. Checkout & Mock Payments (`/api/v1/payments`)

### POST `/api/v1/payments/checkout`
Initiates payment for an active reservation.
- **Body**: `{ reservationId, outcomeSimulation?: "APPROVE" | "DECLINE" | "TIMEOUT", idempotencyKey }`
- **Validations**:
  - Reservation ownership & non-expired status (`expiresAt > now`).
  - Authoritative database pricing (client cannot manipulate total).
- **Response**: `202 Accepted` with orderId, transaction status `PENDING`, and simulation job ID.

### GET `/api/v1/payments/:id/status`
Polls payment transaction and order status (`PENDING`, `APPROVED`, `DECLINED`, `TIMED_OUT`).

---

## 5. Orders & Tickets (`/api/v1/orders`, `/api/v1/tickets`)

### GET `/api/v1/orders`
Returns list of attendee's orders with confirmation status.

### GET `/api/v1/orders/:id`
Returns complete order receipt, breakdown of tiers, payment reference, and associated tickets.

### GET `/api/v1/tickets`
Returns all tickets owned by the authenticated attendee.

### GET `/api/v1/tickets/:id`
Returns ticket details, including ticketCode and QR code SVG/DataURL.

### GET `/api/v1/tickets/:id/verify` (or POST `/api/v1/tickets/verify`)
Organizer / Admin verification endpoint for ticket check-in at event doors.
- Validates cryptographic signature and ticket validity status.
- Updates ticket to `CHECKED_IN` if valid.

---

## 6. Organizer Management (`/api/v1/organizer`)

- `GET /api/v1/organizer/events`: Organizer's events (draft, published, suspended).
- `POST /api/v1/organizer/events`: Create new event.
- `PATCH /api/v1/organizer/events/:id`: Update event (enforces tenant ownership).
- `POST /api/v1/organizer/events/:id/publish`: Publish event.
- `POST /api/v1/organizer/events/:id/unpublish`: Unpublish event.
- `POST /api/v1/organizer/events/:id/ticket-tiers`: Add ticket tier.
- `PATCH /api/v1/organizer/ticket-tiers/:id`: Update tier pricing/quantity (prevents lowering below reserved+sold).
- `GET /api/v1/organizer/events/:id/attendees`: List attendees with CSV export.
- `GET /api/v1/organizer/analytics/overview`: Real-time dashboard KPI metrics.
- `GET /api/v1/organizer/analytics/revenue`: Daily revenue charts and tier performance.

---

## 7. Platform Admin (`/api/v1/admin`)

- `GET /api/v1/admin/overview`: Platform-wide GMV, active users, total bookings.
- `GET /api/v1/admin/users`: User management list.
- `PATCH /api/v1/admin/users/:id/status`: Toggle user status (`ACTIVE`, `SUSPENDED`).
- `GET /api/v1/admin/events`: All platform events.
- `PATCH /api/v1/admin/events/:id/status`: Suspend or reinstate events.
- `GET /api/v1/admin/audit-logs`: Audit trail of security, reservation, and payment operations.
