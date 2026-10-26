/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Ticket as TicketType } from '../types.ts';
import { api } from '../api.ts';
import { Ticket, Calendar, MapPin, Printer, CheckCircle2, Clock, Sparkles, ArrowRight } from 'lucide-react';

interface AttendeeTicketsViewProps {
  onViewTicket: (ticket: TicketType) => void;
  onExplore: () => void;
}

export const AttendeeTicketsView: React.FC<AttendeeTicketsViewProps> = ({ onViewTicket, onExplore }) => {
  const [tickets, setTickets] = useState<TicketType[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'VALID' | 'CHECKED_IN'>('ALL');

  useEffect(() => {
    loadTickets();
  }, []);

  const loadTickets = async () => {
    setLoading(true);
    try {
      const data = await api.getMyTickets();
      setTickets(data);
    } catch (err) {
      console.error('Failed to load tickets', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredTickets = tickets.filter((t) => {
    if (filter === 'ALL') return true;
    return t.status === filter;
  });

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 bg-white">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-[#111827] tracking-tight flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-[#6D28D9] flex items-center justify-center">
              <Ticket className="w-5 h-5" />
            </div>
            My Tickets & Admission Passes
          </h1>
          <p className="text-xs text-[#64748B] mt-1">
            Access, view, and print your cryptographically verified tickets for upcoming events.
          </p>
        </div>

        {/* Status Filter */}
        <div className="flex items-center space-x-1 bg-[#F8FAFC] border border-[#E5E7EB] p-1 rounded-xl text-xs">
          <button
            onClick={() => setFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              filter === 'ALL'
                ? 'bg-[#6D28D9] text-white shadow-2xs'
                : 'text-[#64748B] hover:text-[#111827]'
            }`}
          >
            All Passes ({tickets.length})
          </button>
          <button
            onClick={() => setFilter('VALID')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              filter === 'VALID'
                ? 'bg-[#6D28D9] text-white shadow-2xs'
                : 'text-[#64748B] hover:text-[#111827]'
            }`}
          >
            Valid
          </button>
          <button
            onClick={() => setFilter('CHECKED_IN')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              filter === 'CHECKED_IN'
                ? 'bg-[#6D28D9] text-white shadow-2xs'
                : 'text-[#64748B] hover:text-[#111827]'
            }`}
          >
            Admitted
          </button>
        </div>
      </div>

      {/* Tickets List */}
      {loading ? (
        <div className="bg-[#F8FAFC] border border-[#E5E7EB] rounded-3xl p-12 text-center text-xs text-[#64748B]">
          Loading your verified passes...
        </div>
      ) : filteredTickets.length > 0 ? (
        <div className="space-y-4">
          {filteredTickets.map((t) => (
            <div
              key={t.id}
              className="bg-white border border-[#E5E7EB] hover:border-purple-300 rounded-3xl p-6 shadow-xs hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-6"
            >
              <div className="space-y-2 flex-1">
                <div className="flex items-center space-x-2">
                  <span className="bg-purple-50 text-[#6D28D9] border border-purple-200 text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                    {t.tierName}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                      t.status === 'VALID'
                        ? 'bg-emerald-50 text-[#15803D] border border-emerald-200'
                        : 'bg-slate-100 text-[#64748B] border border-slate-200'
                    }`}
                  >
                    {t.status === 'VALID' ? '● Valid for Entry' : '✓ Checked In'}
                  </span>
                </div>

                <h2 className="text-lg font-extrabold text-[#111827]">
                  {t.eventTitle}
                </h2>

                <div className="flex flex-wrap items-center gap-4 text-xs text-[#64748B]">
                  <span className="flex items-center gap-1.5 text-[#111827] font-semibold">
                    <Calendar className="w-3.5 h-3.5 text-[#6D28D9]" />
                    {t.eventDate
                      ? new Date(t.eventDate).toLocaleDateString('en-IN', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })
                      : 'Confirmed Date'}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-[#64748B]">
                    <MapPin className="w-3.5 h-3.5 text-[#EA580C]" />
                    {t.venueCity || 'Chennai'}
                  </span>
                  <span>•</span>
                  <span className="font-mono text-[#64748B] text-[11px]">
                    Code: <strong className="text-[#111827]">{t.ticketCode}</strong>
                  </span>
                </div>
              </div>

              {/* View QR Button */}
              <div className="flex items-center space-x-3 shrink-0 self-end md:self-center">
                <button
                  onClick={() => onViewTicket(t)}
                  className="bg-[#6D28D9] hover:bg-[#5b21b6] text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-xs transition-colors cursor-pointer flex items-center space-x-2"
                >
                  <Ticket className="w-3.5 h-3.5" />
                  <span>View Pass & QR</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-[#F8FAFC] border border-[#E5E7EB] rounded-3xl p-12 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-[#6D28D9] flex items-center justify-center mx-auto">
            <Ticket className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-[#111827]">No passes found</h3>
          <p className="text-xs text-[#64748B] max-w-sm mx-auto">
            You don't have any tickets under this filter. Explore live events and book admission passes with instant 10-minute hold.
          </p>
          <button
            onClick={onExplore}
            className="bg-[#6D28D9] hover:bg-[#5b21b6] text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-xs transition-colors cursor-pointer inline-flex items-center gap-1.5"
          >
            <span>Explore Events</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
