/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Ticket as TicketType } from '../types.ts';
import { CheckCircle2, Ticket, Printer, ArrowRight, ShieldCheck, Calendar, Sparkles } from 'lucide-react';

import { formatINR } from '../utils/formatters.ts';

interface ConfirmationViewProps {
  orderResult: any;
  onViewTicket: (ticket: TicketType) => void;
  onNavigateTickets: () => void;
  onExploreMore: () => void;
}

export const ConfirmationView: React.FC<ConfirmationViewProps> = ({
  orderResult,
  onViewTicket,
  onNavigateTickets,
  onExploreMore,
}) => {
  useEffect(() => {
    // Launch celebratory confetti burst
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#6D28D9', '#8B5CF6', '#15803D', '#F59E0B'],
      });
    } catch {}
  }, []);

  const tickets: TicketType[] = orderResult?.tickets || [];

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 space-y-8 text-center animate-in fade-in duration-300 bg-white">
      {/* Header Banner */}
      <div className="space-y-3">
        <div className="w-16 h-16 rounded-3xl bg-emerald-50 border border-emerald-200 text-[#15803D] flex items-center justify-center mx-auto shadow-sm">
          <CheckCircle2 className="w-9 h-9" />
        </div>
        <div className="inline-flex items-center space-x-1.5 text-xs text-[#15803D] font-bold uppercase tracking-wider bg-emerald-50 border border-emerald-200 px-3.5 py-1 rounded-full shadow-2xs">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Payment Confirmed & Verified</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-[#111827] tracking-tight">
          You're Going to the Event!
        </h1>
        <p className="text-xs sm:text-sm text-[#64748B] max-w-md mx-auto leading-relaxed">
          Order <strong className="text-[#111827] font-mono">{orderResult.orderNumber}</strong> has been successfully booked. Your digital tickets are ready with cryptographically signed QR passes.
        </p>
      </div>

      {/* Order Info Card */}
      <div className="bg-white border border-[#E5E7EB] rounded-3xl p-6 sm:p-7 text-left shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#E5E7EB] gap-2">
          <div>
            <span className="text-[10px] uppercase font-bold text-[#64748B] block">Event Title</span>
            <span className="text-base font-extrabold text-[#111827]">
              {orderResult.eventTitle || 'Confirmed Event Booking'}
            </span>
          </div>
          <div className="sm:text-right">
            <span className="text-[10px] uppercase font-bold text-[#64748B] block">Total Amount Paid</span>
            <span className="text-base font-black text-[#15803D]">
              {formatINR(orderResult.totalAmount || 0)}
            </span>
          </div>
        </div>

        {/* Issued Digital Tickets List */}
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#111827] mb-3 flex items-center gap-1.5">
            <Ticket className="w-4 h-4 text-[#6D28D9]" />
            Your Issued Admission Passes ({tickets.length})
          </h2>

          <div className="space-y-2.5">
            {tickets.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between p-3.5 bg-[#F8FAFC] border border-[#E5E7EB] hover:border-purple-300 rounded-2xl transition-colors"
              >
                <div>
                  <div className="font-bold text-xs text-[#111827]">{t.tierName}</div>
                  <div className="text-[11px] font-mono text-[#64748B] mt-0.5">
                    Code: <strong className="text-[#111827]">{t.ticketCode}</strong>
                  </div>
                </div>

                <button
                  onClick={() => onViewTicket(t)}
                  className="bg-white hover:bg-purple-50 text-[#6D28D9] border border-purple-200 text-xs font-bold px-3 py-1.5 rounded-xl transition-all shadow-2xs flex items-center space-x-1.5 cursor-pointer"
                >
                  <Ticket className="w-3.5 h-3.5" />
                  <span>View QR Pass</span>
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-3 border-t border-[#E5E7EB] flex items-center justify-between text-xs text-[#64748B]">
          <span className="flex items-center gap-1.5 text-[#15803D] font-semibold">
            <ShieldCheck className="w-4 h-4" />
            Inventory deducted atomically from available quota
          </span>
          <span>Confirmation sent to attendee email</span>
        </div>
      </div>

      {/* Action CTAs */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
        <button
          onClick={onNavigateTickets}
          className="w-full sm:w-auto bg-[#6D28D9] hover:bg-[#5b21b6] text-white text-xs font-bold px-6 py-3 rounded-xl shadow-xs transition-colors cursor-pointer flex items-center justify-center space-x-2"
        >
          <span>View in My Bookings</span>
          <ArrowRight className="w-4 h-4" />
        </button>

        <button
          onClick={onExploreMore}
          className="w-full sm:w-auto bg-white hover:bg-slate-50 text-[#111827] border border-[#E5E7EB] text-xs font-bold px-6 py-3 rounded-xl shadow-2xs transition-colors cursor-pointer"
        >
          Explore More Events
        </button>
      </div>
    </div>
  );
};
