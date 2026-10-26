/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { User, EventItem, OrganizerAnalytics } from '../types.ts';
import { api } from '../api.ts';
import {
  LayoutDashboard,
  Calendar,
  Ticket,
  TrendingUp,
  Users,
  Plus,
  CheckCircle,
  Clock,
  Download,
  AlertCircle,
  FileSpreadsheet,
  Globe,
  Lock,
  Layers,
  X,
} from 'lucide-react';
import { formatINR } from '../utils/formatters.ts';

interface OrganizerDashboardViewProps {
  user: User;
  onExplore: () => void;
}

export const OrganizerDashboardView: React.FC<OrganizerDashboardViewProps> = ({ user, onExplore }) => {
  const [analytics, setAnalytics] = useState<OrganizerAnalytics | null>(null);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'events'>('overview');

  // Create Event Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createTitle, setCreateTitle] = useState('');
  const [createCategory, setCreateCategory] = useState('Technology');
  const [createDescription, setCreateDescription] = useState('');
  const [createStartAt, setCreateStartAt] = useState('');
  const [createEndAt, setCreateEndAt] = useState('');
  const [createVenueName, setCreateVenueName] = useState('Chennai Trade Centre');
  const [createCity, setCreateCity] = useState('Chennai');
  const [createPrice, setCreatePrice] = useState('999');
  const [createCapacity, setCreateCapacity] = useState('500');
  const [createError, setCreateError] = useState<string | null>(null);

  // Attendees Modal state
  const [selectedEventAttendees, setSelectedEventAttendees] = useState<any[] | null>(null);
  const [attendeeEventTitle, setAttendeeEventTitle] = useState('');

  // Add Tier Modal state
  const [tierModalEventId, setTierModalEventId] = useState<string | null>(null);
  const [tierName, setTierName] = useState('VIP Backstage Pass');
  const [tierPrice, setTierPrice] = useState('1499');
  const [tierQuantity, setTierQuantity] = useState('50');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [analyticsData, eventsData] = await Promise.all([
        api.getOrganizerAnalytics(),
        api.getOrganizerEvents(),
      ]);
      setAnalytics(analyticsData);
      setEvents(eventsData);
    } catch (err) {
      console.error('Failed to load organizer dashboard', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePublishToggle = async (eventId: string, currentStatus: string) => {
    try {
      if (currentStatus === 'PUBLISHED') {
        await api.unpublishEvent(eventId);
      } else {
        await api.publishEvent(eventId);
      }
      await loadDashboardData();
    } catch (err: any) {
      alert(err.message || 'Action failed');
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    if (!createTitle || !createDescription || !createStartAt || !createEndAt) {
      setCreateError('Please fill out all required event fields.');
      return;
    }

    try {
      await api.createEvent({
        title: createTitle,
        category: createCategory,
        description: createDescription,
        startAt: new Date(createStartAt).toISOString(),
        endAt: new Date(createEndAt).toISOString(),
        venueName: createVenueName,
        city: createCity,
        tiers: [
          {
            name: 'General Admission',
            price: Math.round(parseFloat(createPrice) * 100),
            totalQuantity: parseInt(createCapacity, 10),
            maxPerOrder: 6,
          },
        ],
      });

      setShowCreateModal(false);
      resetCreateForm();
      await loadDashboardData();
      setActiveTab('events');
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create event.');
    }
  };

  const resetCreateForm = () => {
    setCreateTitle('');
    setCreateDescription('');
    setCreateStartAt('');
    setCreateEndAt('');
    setCreatePrice('99.00');
    setCreateCapacity('200');
    setCreateError(null);
  };

  const handleAddTier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tierModalEventId) return;

    try {
      await api.addTicketTier(tierModalEventId, {
        name: tierName,
        price: Math.round(parseFloat(tierPrice) * 100),
        totalQuantity: parseInt(tierQuantity, 10),
        maxPerOrder: 6,
      });

      setTierModalEventId(null);
      await loadDashboardData();
    } catch (err: any) {
      alert(err.message || 'Failed to add tier.');
    }
  };

  const handleViewAttendees = async (eventId: string, title: string) => {
    try {
      setAttendeeEventTitle(title);
      const res = await api.getEventAttendees(eventId);
      setSelectedEventAttendees(res.attendees || []);
    } catch (err: any) {
      alert(err.message || 'Failed to load attendees');
    }
  };

  const handleExportCSV = (eventId: string) => {
    window.open(`/api/v1/organizer/events/${eventId}/attendees?format=csv`, '_blank');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 bg-white">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#E5E7EB]">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#6D28D9] bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200">
              {user.organizationName || 'Organizer Studio'}
            </span>
            <span className="text-[#94A3B8]">•</span>
            <span className="text-xs text-[#64748B]">Multi-Tenant ID: {user.organizerProfileId}</span>
          </div>
          <h1 className="text-3xl font-black text-[#111827] tracking-tight mt-1">
            Organizer Management & Analytics
          </h1>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-[#6D28D9] hover:bg-[#5b21b6] text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Event</span>
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex space-x-2 border-b border-[#E5E7EB] pb-2">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === 'overview'
              ? 'bg-purple-50 text-[#6D28D9] border border-purple-200'
              : 'text-[#64748B] hover:text-[#111827]'
          }`}
        >
          <LayoutDashboard className="w-4 h-4 text-[#6D28D9]" />
          Revenue & Analytics Overview
        </button>
        <button
          onClick={() => setActiveTab('events')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === 'events'
              ? 'bg-purple-50 text-[#6D28D9] border border-purple-200'
              : 'text-[#64748B] hover:text-[#111827]'
          }`}
        >
          <Calendar className="w-4 h-4 text-[#8B5CF6]" />
          Manage My Events ({events.length})
        </button>
      </div>

      {/* TAB 1: Real Database Analytics Overview */}
      {activeTab === 'overview' && analytics && (
        <div className="space-y-8 animate-in fade-in duration-200">
          {/* Key KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Revenue */}
            <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 space-y-1 shadow-xs">
              <div className="flex items-center justify-between text-[#64748B] text-xs font-bold">
                <span>Total Confirmed Revenue</span>
                <span className="text-xs font-black text-[#15803D] bg-emerald-50 px-2 py-0.5 rounded-full">₹ INR</span>
              </div>
              <div className="text-2xl font-black text-[#111827] font-mono">
                {formatINR(analytics.totalRevenue)}
              </div>
              <div className="text-[11px] text-[#64748B]">
                Gross Booking Value: {formatINR(analytics.grossBookingValue)}
              </div>
            </div>

            {/* Tickets Sold */}
            <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 space-y-1 shadow-xs">
              <div className="flex items-center justify-between text-[#64748B] text-xs font-bold">
                <span>Tickets Sold</span>
                <Ticket className="w-4 h-4 text-[#6D28D9]" />
              </div>
              <div className="text-2xl font-black text-[#111827] font-mono">
                {analytics.ticketsSold}
              </div>
              <div className="text-[11px] text-[#64748B]">
                Across {events.length} tenant events
              </div>
            </div>

            {/* Live Inventory Status */}
            <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 space-y-1 shadow-xs">
              <div className="flex items-center justify-between text-[#64748B] text-xs font-bold">
                <span>Held vs Available</span>
                <Clock className="w-4 h-4 text-[#D97706]" />
              </div>
              <div className="text-xl font-black text-[#111827] flex items-center gap-2">
                <span className="text-[#D97706] font-mono">{analytics.ticketsReserved}</span>
                <span className="text-[#94A3B8] text-sm font-normal">held /</span>
                <span className="text-[#15803D] font-mono">{analytics.availableInventory}</span>
                <span className="text-[#94A3B8] text-sm font-normal">avail</span>
              </div>
              <div className="text-[11px] text-[#64748B]">
                Total Physical Capacity: {analytics.totalInventory}
              </div>
            </div>

            {/* Conversion Rate */}
            <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 space-y-1 shadow-xs">
              <div className="flex items-center justify-between text-[#64748B] text-xs font-bold">
                <span>Hold Conversion</span>
                <TrendingUp className="w-4 h-4 text-[#6D28D9]" />
              </div>
              <div className="text-2xl font-black text-[#6D28D9] font-mono">
                {analytics.conversionRate}%
              </div>
              <div className="text-[11px] text-[#64748B]">
                {analytics.confirmedOrders} orders / {analytics.reservationSessions} sessions
              </div>
            </div>
          </div>

          {/* Real Inventory Breakdown Table */}
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-[#111827] uppercase tracking-wider">
              Event-Level Inventory & Performance
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#E5E7EB] text-[#64748B] uppercase text-[10px] tracking-wider font-bold">
                    <th className="pb-3">Event Title</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3">Capacity</th>
                    <th className="pb-3">Available</th>
                    <th className="pb-3">Held (10m)</th>
                    <th className="pb-3">Sold</th>
                    <th className="pb-3 text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB]">
                  {events.map((evt: any) => (
                    <tr key={evt.id} className="hover:bg-slate-50">
                      <td className="py-3 font-bold text-[#111827]">{evt.title}</td>
                      <td className="py-3">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                            evt.status === 'PUBLISHED'
                              ? 'bg-emerald-50 text-[#15803D] border border-emerald-200'
                              : 'bg-slate-100 text-[#64748B] border border-slate-200'
                          }`}
                        >
                          {evt.status}
                        </span>
                      </td>
                      <td className="py-3 text-[#111827] font-mono">{evt.total_inventory || 0}</td>
                      <td className="py-3 text-[#15803D] font-mono font-bold">{evt.available_inventory || 0}</td>
                      <td className="py-3 text-[#D97706] font-mono font-bold">{evt.reserved_inventory || 0}</td>
                      <td className="py-3 text-[#6D28D9] font-mono font-bold">{evt.sold_inventory || 0}</td>
                      <td className="py-3 text-right font-black text-[#111827] font-mono">
                        ${(((evt.total_revenue || 0)) / 100).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Manage My Events */}
      {activeTab === 'events' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="grid grid-cols-1 gap-6">
            {events.map((evt: any) => (
              <div
                key={evt.id}
                className="bg-white border border-[#E5E7EB] rounded-3xl p-6 shadow-xs space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#E5E7EB] gap-3">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-base font-bold text-[#111827]">{evt.title}</span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                          evt.status === 'PUBLISHED'
                            ? 'bg-emerald-50 text-[#15803D] border border-emerald-200'
                            : 'bg-amber-50 text-[#D97706] border border-amber-200'
                        }`}
                      >
                        {evt.status}
                      </span>
                    </div>
                    <div className="text-xs text-[#64748B] mt-1">
                      {new Date(evt.start_at).toLocaleDateString()} • {evt.venue_name}, {evt.venue_city}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => handlePublishToggle(evt.id, evt.status)}
                      className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-colors cursor-pointer ${
                        evt.status === 'PUBLISHED'
                          ? 'bg-amber-50 text-[#D97706] border-amber-200 hover:bg-amber-100'
                          : 'bg-emerald-50 text-[#15803D] border-emerald-200 hover:bg-emerald-100'
                      }`}
                    >
                      {evt.status === 'PUBLISHED' ? 'Unpublish' : 'Publish to Live'}
                    </button>

                    <button
                      onClick={() => setTierModalEventId(evt.id)}
                      className="bg-white hover:bg-slate-50 text-[#111827] text-xs font-bold px-3 py-1.5 rounded-xl border border-[#E5E7EB] transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                    >
                      <Plus className="w-3.5 h-3.5 text-[#6D28D9]" />
                      <span>Add Tier</span>
                    </button>

                    <button
                      onClick={() => handleViewAttendees(evt.id, evt.title)}
                      className="bg-purple-50 hover:bg-purple-100 text-[#6D28D9] text-xs font-bold px-3 py-1.5 rounded-xl border border-purple-200 transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>Attendees</span>
                    </button>

                    <button
                      onClick={() => handleExportCSV(evt.id)}
                      className="bg-white hover:bg-slate-50 text-[#64748B] text-xs font-bold px-3 py-1.5 rounded-xl border border-[#E5E7EB] transition-colors cursor-pointer flex items-center gap-1"
                      title="Export verified attendee roster as CSV"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>CSV</span>
                    </button>
                  </div>
                </div>

                {/* Ticket Tiers in this Event */}
                <div>
                  <h4 className="text-xs font-bold text-[#64748B] uppercase tracking-wider mb-2">
                    Configured Ticket Tiers ({evt.ticketTiers?.length || 0})
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {evt.ticketTiers?.map((t: any) => (
                      <div key={t.id} className="bg-[#F8FAFC] p-3.5 rounded-2xl border border-[#E5E7EB] text-xs">
                        <div className="font-bold text-[#111827]">{t.name}</div>
                        <div className="text-[#6D28D9] font-extrabold text-sm mt-0.5">
                          {formatINR(t.price)}
                        </div>
                        <div className="text-[11px] text-[#64748B] mt-1 flex justify-between">
                          <span>Total: {t.total_quantity}</span>
                          <span className="text-[#15803D] font-bold">{t.available_quantity} avail</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CREATE EVENT MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E5E7EB] rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-[#E5E7EB] pb-3">
              <h3 className="text-base font-black text-[#111827]">Create New Event</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-[#64748B] hover:text-[#111827] cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {createError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-[#DC2626] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreateEvent} className="space-y-3.5 text-xs">
              <div>
                <label className="text-[#111827] font-bold block mb-1">Event Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Distributed Systems Forum 2026"
                  value={createTitle}
                  onChange={(e) => setCreateTitle(e.target.value)}
                  className="w-full bg-white border border-[#E5E7EB] rounded-xl px-3 py-2 text-[#111827] focus:outline-none focus:border-[#6D28D9]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[#111827] font-bold block mb-1">Category</label>
                  <select
                    value={createCategory}
                    onChange={(e) => setCreateCategory(e.target.value)}
                    className="w-full bg-white border border-[#E5E7EB] rounded-xl px-3 py-2 text-[#111827] focus:outline-none"
                  >
                    <option value="Technology">Technology</option>
                    <option value="College Festivals">College Festivals</option>
                    <option value="Concerts">Concerts</option>
                    <option value="Hackathons">Hackathons</option>
                    <option value="Conferences">Conferences</option>
                    <option value="Cultural Celebrations">Cultural Celebrations</option>
                  </select>
                </div>
                <div>
                  <label className="text-[#111827] font-bold block mb-1">Venue Name</label>
                  <input
                    type="text"
                    value={createVenueName}
                    onChange={(e) => setCreateVenueName(e.target.value)}
                    className="w-full bg-white border border-[#E5E7EB] rounded-xl px-3 py-2 text-[#111827]"
                  />
                </div>
              </div>

              <div>
                <label className="text-[#111827] font-bold block mb-1">Description *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Event agenda, keynote topics, and attendee information..."
                  value={createDescription}
                  onChange={(e) => setCreateDescription(e.target.value)}
                  className="w-full bg-white border border-[#E5E7EB] rounded-xl px-3 py-2 text-[#111827] focus:outline-none focus:border-[#6D28D9]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[#111827] font-bold block mb-1">Start Date & Time *</label>
                  <input
                    type="datetime-local"
                    required
                    value={createStartAt}
                    onChange={(e) => setCreateStartAt(e.target.value)}
                    className="w-full bg-white border border-[#E5E7EB] rounded-xl px-3 py-2 text-[#111827]"
                  />
                </div>
                <div>
                  <label className="text-[#111827] font-bold block mb-1">End Date & Time *</label>
                  <input
                    type="datetime-local"
                    required
                    value={createEndAt}
                    onChange={(e) => setCreateEndAt(e.target.value)}
                    className="w-full bg-white border border-[#E5E7EB] rounded-xl px-3 py-2 text-[#111827]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#E5E7EB]">
                <div>
                  <label className="text-[#111827] font-bold block mb-1">General Ticket Price (₹ INR)</label>
                  <input
                    type="number"
                    step="1"
                    value={createPrice}
                    onChange={(e) => setCreatePrice(e.target.value)}
                    className="w-full bg-white border border-[#E5E7EB] rounded-xl px-3 py-2 text-[#111827]"
                  />
                </div>
                <div>
                  <label className="text-[#111827] font-bold block mb-1">Initial Capacity</label>
                  <input
                    type="number"
                    value={createCapacity}
                    onChange={(e) => setCreateCapacity(e.target.value)}
                    className="w-full bg-white border border-[#E5E7EB] rounded-xl px-3 py-2 text-[#111827]"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end space-x-2 border-t border-[#E5E7EB]">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl text-[#64748B] hover:text-[#111827]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-[#6D28D9] hover:bg-[#5b21b6] text-white font-bold px-4 py-2 rounded-xl shadow-xs cursor-pointer"
                >
                  Save as Draft
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD TIER MODAL */}
      {tierModalEventId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E5E7EB] rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-[#111827]">Add Ticket Tier</h3>
            <form onSubmit={handleAddTier} className="space-y-3 text-xs">
              <div>
                <label className="text-[#111827] font-bold block mb-1">Tier Name</label>
                <input
                  type="text"
                  required
                  value={tierName}
                  onChange={(e) => setTierName(e.target.value)}
                  className="w-full bg-white border border-[#E5E7EB] rounded-xl px-3 py-2 text-[#111827]"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[#111827] font-bold block mb-1">Price (₹ INR)</label>
                  <input
                    type="number"
                    step="1"
                    required
                    value={tierPrice}
                    onChange={(e) => setTierPrice(e.target.value)}
                    className="w-full bg-white border border-[#E5E7EB] rounded-xl px-3 py-2 text-[#111827]"
                  />
                </div>
                <div>
                  <label className="text-[#111827] font-bold block mb-1">Quantity</label>
                  <input
                    type="number"
                    required
                    value={tierQuantity}
                    onChange={(e) => setTierQuantity(e.target.value)}
                    className="w-full bg-white border border-[#E5E7EB] rounded-xl px-3 py-2 text-[#111827]"
                  />
                </div>
              </div>
              <div className="pt-2 flex justify-end space-x-2 border-t border-[#E5E7EB]">
                <button
                  type="button"
                  onClick={() => setTierModalEventId(null)}
                  className="px-3 py-1.5 text-[#64748B] hover:text-[#111827]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-[#6D28D9] hover:bg-[#5b21b6] text-white font-bold px-3 py-1.5 rounded-xl cursor-pointer"
                >
                  Create Tier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ATTENDEES ROSTER MODAL */}
      {selectedEventAttendees && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E5E7EB] rounded-3xl p-6 max-w-2xl w-full shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center pb-3 border-b border-[#E5E7EB]">
              <div>
                <h3 className="text-base font-bold text-[#111827]">Attendee Roster</h3>
                <p className="text-xs text-[#64748B]">{attendeeEventTitle}</p>
              </div>
              <button
                onClick={() => setSelectedEventAttendees(null)}
                className="text-[#64748B] hover:text-[#111827] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1">
              {selectedEventAttendees.length > 0 ? (
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#E5E7EB] text-[#64748B] uppercase text-[10px]">
                      <th className="pb-2">Ticket Code</th>
                      <th className="pb-2">Attendee</th>
                      <th className="pb-2">Tier</th>
                      <th className="pb-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E7EB]">
                    {selectedEventAttendees.map((a: any) => (
                      <tr key={a.ticket_id} className="hover:bg-slate-50">
                        <td className="py-2.5 font-mono text-[#6D28D9] font-bold">{a.ticket_code}</td>
                        <td className="py-2.5">
                          <div className="font-bold text-[#111827]">{a.attendee_name}</div>
                          <div className="text-[11px] text-[#64748B]">{a.attendee_email}</div>
                        </td>
                        <td className="py-2.5 text-[#111827]">{a.tier_name}</td>
                        <td className="py-2.5">
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                              a.ticket_status === 'CHECKED_IN'
                                ? 'bg-blue-50 text-blue-600 border border-blue-200'
                                : 'bg-emerald-50 text-[#15803D] border border-emerald-200'
                            }`}
                          >
                            {a.ticket_status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="py-12 text-center text-xs text-[#64748B]">
                  No confirmed attendees yet for this event.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
