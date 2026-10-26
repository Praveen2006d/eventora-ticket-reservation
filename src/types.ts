/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Role = 'ADMIN' | 'ORGANIZER' | 'ATTENDEE';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: 'ACTIVE' | 'SUSPENDED';
  createdAt?: string;
  organizerProfileId?: string;
  organizationName?: string;
  activeReservationsCount?: number;
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

export interface TicketTier {
  id: string;
  eventId: string;
  name: string;
  description?: string;
  price: number; // in cents
  currency: string;
  totalQuantity: number;
  availableQuantity: number;
  reservedQuantity: number;
  soldQuantity: number;
  maxPerOrder: number;
}

export interface EventItem {
  id: string;
  title: string;
  slug: string;
  description: string;
  category: string;
  posterUrl: string;
  startAt: string;
  endAt: string;
  salesCutoffAt: string;
  status: 'DRAFT' | 'PUBLISHED' | 'SUSPENDED' | 'CANCELLED';
  startingPrice?: number;
  totalAvailableTickets?: number;
  totalTickets?: number;
  venue: Venue;
  organizer: {
    id: string;
    organizationName: string;
    description?: string;
    verificationStatus?: string;
  };
  ticketTiers?: TicketTier[];
}

export interface ReservationHold {
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

export interface Ticket {
  id: string;
  ticketCode: string;
  qrCodeData: string;
  status: 'VALID' | 'CHECKED_IN' | 'CANCELLED';
  issuedAt: string;
  checkedInAt?: string;
  eventTitle: string;
  tierName: string;
  venueName?: string;
  venueAddress?: string;
  venueCity?: string;
  eventDate?: string;
  orderNumber?: string;
  attendeeName?: string;
  attendeeEmail?: string;
  qrDataUrl?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  subtotal: number;
  fees: number;
  totalAmount: number;
  currency: string;
  status: 'PENDING' | 'CONFIRMED' | 'FAILED';
  createdAt: string;
  eventTitle?: string;
  eventPoster?: string;
  eventStart?: string;
  venueName?: string;
  venueCity?: string;
  ticketCount?: number;
}

export interface OrganizerAnalytics {
  totalRevenue: number;
  grossBookingValue: number;
  ticketsSold: number;
  ticketsReserved: number;
  availableInventory: number;
  totalInventory: number;
  totalOrders: number;
  confirmedOrders: number;
  successfulPayments: number;
  failedPayments: number;
  conversionRate: number;
  reservationSessions: number;
  currency: string;
}
