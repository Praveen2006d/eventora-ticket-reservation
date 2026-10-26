/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { User, EventItem, TicketTier, ReservationHold, Ticket, Order, OrganizerAnalytics } from './types.ts';

const API_BASE = '/api/v1';

class ApiClient {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('eventora_access_token');
  }

  public setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('eventora_access_token', token);
    } else {
      localStorage.removeItem('eventora_access_token');
    }
  }

  public getToken(): string | null {
    return this.token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const errorMsg = data?.error?.message || data?.message || `Request failed with status ${response.status}`;
      const err = new Error(errorMsg);
      (err as any).status = response.status;
      (err as any).code = data?.error?.code;
      throw err;
    }

    return data.data !== undefined ? data.data : data;
  }

  // --- Auth ---
  async login(email: string, password: string): Promise<{ user: User; accessToken: string }> {
    const res = await this.request<{ user: User; accessToken: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.setToken(res.accessToken);
    return res;
  }

  async register(data: { name: string; email: string; password: string; role?: string; organizationName?: string }): Promise<{ user: User; accessToken: string }> {
    const res = await this.request<{ user: User; accessToken: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    this.setToken(res.accessToken);
    return res;
  }

  async logout(): Promise<void> {
    await this.request('/auth/logout', { method: 'POST' }).catch(() => {});
    this.setToken(null);
  }

  async getMe(): Promise<User> {
    const res = await this.request<{ user: User }>('/auth/me');
    return res.user;
  }

  // --- Events ---
  async getEvents(params: { q?: string; category?: string; city?: string } = {}): Promise<EventItem[]> {
    const query = new URLSearchParams();
    if (params.q) query.append('q', params.q);
    if (params.category && params.category !== 'All') query.append('category', params.category);
    if (params.city && params.city !== 'All') query.append('city', params.city);

    const qs = query.toString();
    return this.request<EventItem[]>(`/events${qs ? `?${qs}` : ''}`);
  }

  async getEventById(id: string): Promise<EventItem> {
    return this.request<EventItem>(`/events/${id}`);
  }

  async getTicketTiers(eventId: string): Promise<TicketTier[]> {
    return this.request<TicketTier[]>(`/events/${eventId}/ticket-tiers`);
  }

  // --- Reservations ---
  async createReservation(items: Array<{ ticketTierId: string; quantity: number }>, idempotencyKey?: string): Promise<ReservationHold> {
    const headers: Record<string, string> = {};
    if (idempotencyKey) {
      headers['Idempotency-Key'] = idempotencyKey;
    }
    return this.request<ReservationHold>('/reservations', {
      method: 'POST',
      headers,
      body: JSON.stringify({ items, idempotencyKey }),
    });
  }

  async getReservation(id: string): Promise<ReservationHold> {
    return this.request<ReservationHold>(`/reservations/${id}`);
  }

  async releaseReservation(id: string): Promise<void> {
    await this.request(`/reservations/${id}/release`, { method: 'POST' });
  }

  // --- Checkout & Payments ---
  async checkout(data: {
    reservationId: string;
    outcomeSimulation?: 'APPROVE' | 'DECLINE' | 'TIMEOUT';
    idempotencyKey?: string;
  }): Promise<{
    orderId: string;
    orderNumber: string;
    transactionId: string;
    status: string;
    paymentStatus: string;
    totalAmount: number;
    currency: string;
  }> {
    return this.request('/payments/checkout', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getPaymentStatus(id: string): Promise<{
    orderId: string;
    orderNumber: string;
    transactionId: string;
    status: 'PENDING' | 'CONFIRMED' | 'FAILED';
    paymentStatus: 'PENDING' | 'APPROVED' | 'DECLINED' | 'TIMED_OUT';
    providerReference?: string;
    failureReason?: string;
    totalAmount: number;
    currency: string;
    eventTitle?: string;
    eventId?: string;
    tickets?: Ticket[];
  }> {
    return this.request(`/payments/${id}/status`);
  }

  // --- Orders & Tickets ---
  async getMyOrders(): Promise<Order[]> {
    return this.request<Order[]>('/orders');
  }

  async getOrderById(id: string): Promise<any> {
    return this.request(`/orders/${id}`);
  }

  async getMyTickets(): Promise<Ticket[]> {
    return this.request<Ticket[]>('/tickets');
  }

  async getTicketById(id: string): Promise<Ticket> {
    return this.request<Ticket>(`/tickets/${id}`);
  }

  async verifyTicket(ticketCode: string, markCheckedIn: boolean = false): Promise<any> {
    return this.request('/tickets/verify', {
      method: 'POST',
      body: JSON.stringify({ ticketCode, markCheckedIn }),
    });
  }

  // --- Organizer ---
  async getOrganizerEvents(): Promise<EventItem[]> {
    return this.request<EventItem[]>('/organizer/events');
  }

  async createEvent(eventData: any): Promise<any> {
    return this.request('/organizer/events', {
      method: 'POST',
      body: JSON.stringify(eventData),
    });
  }

  async updateEvent(id: string, updates: any): Promise<any> {
    return this.request(`/organizer/events/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  async publishEvent(id: string): Promise<any> {
    return this.request(`/organizer/events/${id}/publish`, { method: 'POST' });
  }

  async unpublishEvent(id: string): Promise<any> {
    return this.request(`/organizer/events/${id}/unpublish`, { method: 'POST' });
  }

  async addTicketTier(eventId: string, tier: any): Promise<any> {
    return this.request(`/organizer/events/${eventId}/ticket-tiers`, {
      method: 'POST',
      body: JSON.stringify(tier),
    });
  }

  async updateTicketTier(tierId: string, updates: any): Promise<any> {
    return this.request(`/organizer/ticket-tiers/${tierId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  async getEventAttendees(eventId: string): Promise<any> {
    return this.request(`/organizer/events/${eventId}/attendees`);
  }

  async getOrganizerAnalytics(): Promise<OrganizerAnalytics> {
    return this.request<OrganizerAnalytics>('/organizer/analytics/overview');
  }

  async getOrganizerRevenueCharts(): Promise<any> {
    return this.request('/organizer/analytics/revenue');
  }

  // --- Admin ---
  async getAdminOverview(): Promise<any> {
    return this.request('/admin/overview');
  }

  async getAdminUsers(): Promise<any[]> {
    return this.request<any[]>('/admin/users');
  }

  async updateUserStatus(userId: string, status: 'ACTIVE' | 'SUSPENDED'): Promise<any> {
    return this.request(`/admin/users/${userId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  async getAdminEvents(): Promise<any[]> {
    return this.request<any[]>('/admin/events');
  }

  async updateAdminEventStatus(eventId: string, status: string, reason?: string): Promise<any> {
    return this.request(`/admin/events/${eventId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, reason }),
    });
  }

  async getAdminAuditLogs(): Promise<any[]> {
    return this.request<any[]>('/admin/audit-logs');
  }

  async runAdminConcurrencyTest(tierId?: string, concurrentRequests: number = 50): Promise<any> {
    return this.request('/admin/test-concurrency', {
      method: 'POST',
      body: JSON.stringify({ tierId, concurrentRequests }),
    });
  }
}

export const api = new ApiClient();
