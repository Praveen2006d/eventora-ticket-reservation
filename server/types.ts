/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Role = 'ADMIN' | 'ORGANIZER' | 'ATTENDEE';

export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'PENDING_VERIFICATION';

export type VerificationStatus = 'UNVERIFIED' | 'PENDING' | 'VERIFIED' | 'REJECTED';

export type EventStatus = 'DRAFT' | 'PUBLISHED' | 'SUSPENDED' | 'CANCELLED' | 'COMPLETED';

export type ReservationStatus = 'HELD' | 'PAYMENT_PENDING' | 'CONFIRMED' | 'EXPIRED' | 'RELEASED';

export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'FAILED' | 'CANCELLED' | 'REFUNDED';

export type PaymentStatus = 'PENDING' | 'PROCESSING' | 'APPROVED' | 'DECLINED' | 'TIMED_OUT' | 'FAILED';

export type TicketStatus = 'VALID' | 'CHECKED_IN' | 'CANCELLED';

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
  organizerProfile?: OrganizerProfile;
}

export interface OrganizerProfile {
  id: string;
  userId: string;
  organizationName: string;
  description?: string;
  verificationStatus: VerificationStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Venue {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  country: string;
  capacity: number;
}

export interface Event {
  id: string;
  organizerId: string;
  venueId: string;
  title: string;
  slug: string;
  description: string;
  category: string;
  posterUrl: string;
  startAt: string;
  endAt: string;
  salesStartAt: string;
  salesCutoffAt: string;
  status: EventStatus;
  createdAt: string;
  updatedAt: string;
  venue?: Venue;
  organizer?: OrganizerProfile;
  ticketTiers?: TicketTier[];
  startingPrice?: number;
}

export interface TicketTier {
  id: string;
  eventId: string;
  name: string;
  description?: string;
  price: number; // minor units (cents)
  currency: string;
  totalQuantity: number;
  availableQuantity: number;
  reservedQuantity: number;
  soldQuantity: number;
  salesStartAt?: string;
  salesEndAt?: string;
  maxPerOrder: number;
}

export interface ReservationItem {
  id: string;
  reservationId: string;
  ticketTierId: string;
  quantity: number;
  unitPrice: number;
  tierName?: string;
}

export interface Reservation {
  id: string;
  attendeeId: string;
  status: ReservationStatus;
  idempotencyKey?: string;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
  items: ReservationItem[];
  eventTitle?: string;
  eventId?: string;
  totalAmount?: number;
}

export interface OrderItem {
  id: string;
  orderId: string;
  ticketTierId: string;
  quantity: number;
  unitPrice: number;
  tierName?: string;
}

export interface Order {
  id: string;
  attendeeId: string;
  reservationId?: string;
  orderNumber: string;
  subtotal: number;
  fees: number;
  totalAmount: number;
  currency: string;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
  items?: OrderItem[];
  tickets?: Ticket[];
  eventTitle?: string;
  eventId?: string;
}

export interface PaymentTransaction {
  id: string;
  orderId: string;
  provider: string;
  providerReference?: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  idempotencyKey: string;
  failureReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Ticket {
  id: string;
  orderItemId: string;
  attendeeId: string;
  eventId: string;
  ticketCode: string;
  qrCodeData: string;
  status: TicketStatus;
  issuedAt: string;
  checkedInAt?: string;
  eventTitle?: string;
  tierName?: string;
  venueName?: string;
  eventDate?: string;
}

export interface AuditLog {
  id: string;
  actorId?: string;
  actorEmail?: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: string;
  createdAt: string;
}
