/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { EventItem, TicketTier, ReservationHold } from '../types.ts';
import { api } from '../api.ts';
import {
  Calendar,
  MapPin,
  Clock,
  ShieldCheck,
  Ticket,
  AlertCircle,
  Plus,
  Minus,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Users,
  Building2,
  Lock,
} from 'lucide-react';
import { formatINR, formatIndianDate, formatIndianTime } from '../utils/formatters.ts';

interface EventDetailsViewProps {
  event: EventItem;
  onBack: () => void;
  onReservationCreated: (hold: ReservationHold) => void;
  onOpenAuth: () => void;
  isAuthenticated: boolean;
}

export const EventDetailsView: React.FC<EventDetailsViewProps> = ({
  event,
  onBack,
  onReservationCreated,
  onOpenAuth,
  isAuthenticated,
}) => {
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const tiers: TicketTier[] = event.ticketTiers || [];

  const updateQuantity = (tierId: string, delta: number, maxAllowed: number) => {
    setErrorMessage(null);
    setQuantities((prev) => {
      const current = prev[tierId] || 0;
      const next = Math.max(0, Math.min(maxAllowed, current + delta));
      return { ...prev, [tierId]: next };
    });
  };

  // Calculate order subtotal
  const selectedItems = Object.entries(quantities)
    .filter(([_, qty]) => qty > 0)
    .map(([tierId, qty]) => {
      const tier = tiers.find((t) => t.id === tierId);
      return {
        ticketTierId: tierId,
        tierName: tier?.name || 'Tier',
        quantity: qty,
        unitPrice: tier?.price || 0,
      };
    });

  const totalTicketsSelected = selectedItems.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = selectedItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const fees = Math.round(subtotal * 0.05);
  const totalAmount = subtotal + fees;

  const handleReserve = async () => {
    if (!isAuthenticated) {
      onOpenAuth();
      return;
    }

    if (totalTicketsSelected <= 0) {
      setErrorMessage('Please select at least 1 ticket to reserve.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const itemsToHold = selectedItems.map((i) => ({
        ticketTierId: i.ticketTierId,
        quantity: i.quantity,
      }));

      const hold = await api.createReservation(itemsToHold);
      onReservationCreated(hold);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to place ticket hold. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formattedDate = formatIndianDate(event.startAt);
  const formattedTime = formatIndianTime(event.startAt);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 bg-white">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="inline-flex items-center space-x-2 text-xs font-bold text-[#64748B] hover:text-[#6D28D9] transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Events</span>
      </button>

      {/* Main Grid: Left Event Details + Right Ticket Selection */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Event Hero & Info */}
        <div className="lg:col-span-7 space-y-6">
          {/* Poster */}
          <div className="relative h-72 sm:h-96 rounded-3xl overflow-hidden border border-[#E5E7EB] shadow-xs bg-slate-100">
            <img
              src={event.posterUrl}
              alt={event.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-md border border-[#E5E7EB] text-[#6D28D9] text-xs font-bold px-3 py-1 rounded-full shadow-xs">
              {event.category}
            </div>
            <div className="absolute top-4 right-4 bg-emerald-50 border border-emerald-200 text-[#15803D] text-xs font-bold px-3 py-1 rounded-full backdrop-blur-md flex items-center gap-1.5 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-[#15803D] animate-pulse"></span>
              Verified Event
            </div>
          </div>

          {/* Event Title & Schedule Info */}
          <div className="space-y-4">
            <h1 className="text-2xl sm:text-4xl font-black text-[#111827] tracking-tight leading-tight">
              {event.title}
            </h1>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex items-center space-x-3 bg-[#F8FAFC] border border-[#E5E7EB] p-3.5 rounded-2xl">
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-[#6D28D9] flex items-center justify-center shrink-0">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[11px] text-[#64748B] font-semibold uppercase tracking-wider">Date & Time</div>
                  <div className="text-xs font-bold text-[#111827]">{formattedDate}</div>
                  <div className="text-[11px] text-[#6D28D9] font-medium">{formattedTime}</div>
                </div>
              </div>

              <div className="flex items-center space-x-3 bg-[#F8FAFC] border border-[#E5E7EB] p-3.5 rounded-2xl">
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-[#6D28D9] flex items-center justify-center shrink-0">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[11px] text-[#64748B] font-semibold uppercase tracking-wider">Location</div>
                  <div className="text-xs font-bold text-[#111827]">{event.venue.name}</div>
                  <div className="text-[11px] text-[#64748B] truncate">
                    {event.venue.address}, {event.venue.city}
                  </div>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 space-y-3 shadow-2xs">
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#111827]">
                About This Event
              </h2>
              <p className="text-xs sm:text-sm text-[#4B5563] leading-relaxed whitespace-pre-line">
                {event.description}
              </p>
            </div>

            {/* Organizer Card */}
            <div className="bg-[#F8FAFC] border border-[#E5E7EB] rounded-2xl p-5 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-11 h-11 rounded-xl bg-purple-100 text-[#6D28D9] flex items-center justify-center font-black text-sm">
                  {event.organizer.organizationName.charAt(0)}
                </div>
                <div>
                  <div className="text-xs font-bold text-[#111827]">
                    {event.organizer.organizationName}
                  </div>
                  <div className="text-[11px] text-[#64748B] flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#15803D]" />
                    Verified Organizer • Multi-Tenant Isolated
                  </div>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[11px] text-[#64748B] font-semibold block">Venue Capacity</span>
                <span className="text-xs font-bold text-[#111827]">
                  {(event.venue?.capacity || event.totalTickets || 1200).toLocaleString()} seats
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Ticket Tiers & Reservation Card */}
        <div className="lg:col-span-5 space-y-6">
          {/* Ticket Tiers Selection */}
          <div className="bg-white border border-[#E5E7EB] rounded-3xl p-6 shadow-sm space-y-5">
            <div>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-black text-[#111827] flex items-center gap-2">
                  <Ticket className="w-5 h-5 text-[#6D28D9]" />
                  Select Admission Passes
                </h2>
                <span className="text-[11px] text-[#64748B] font-bold bg-slate-100 px-2 py-0.5 rounded-full">
                  Max 6 / Order
                </span>
              </div>
              <p className="text-xs text-[#64748B] mt-0.5">
                Lock your tickets for 10 minutes with zero overselling guarantee.
              </p>
            </div>

            {/* Tier Items */}
            <div className="space-y-3">
              {tiers.map((tier) => {
                const qty = quantities[tier.id] || 0;
                const isSoldOut = tier.availableQuantity <= 0;
                const maxOrder = Math.min(tier.maxPerOrder || 6, tier.availableQuantity);

                return (
                  <div
                    key={tier.id}
                    className={`border rounded-2xl p-4 transition-all ${
                      qty > 0
                        ? 'bg-purple-50/40 border-[#6D28D9] shadow-xs'
                        : 'bg-white border-[#E5E7EB] hover:border-purple-300'
                    } ${isSoldOut ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h3 className="text-sm font-bold text-[#111827]">{tier.name}</h3>
                          {tier.availableQuantity <= 10 && tier.availableQuantity > 0 && (
                            <span className="bg-amber-50 text-[#D97706] border border-amber-200 text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                              Only {tier.availableQuantity} left
                            </span>
                          )}
                        </div>
                        {tier.description && (
                          <p className="text-[11px] text-[#64748B] mt-1 leading-snug">
                            {tier.description}
                          </p>
                        )}
                        <div className="mt-2 text-base font-extrabold text-[#111827]">
                          {formatINR(tier.price)}
                          <span className="text-[11px] font-normal text-[#64748B] ml-1">/ ticket</span>
                        </div>
                      </div>

                      {/* Quantity Stepper */}
                      <div className="shrink-0 self-center">
                        {isSoldOut ? (
                          <span className="text-[10px] uppercase font-bold text-[#DC2626] bg-red-50 border border-red-200 px-2 py-1 rounded-lg">
                            Sold Out
                          </span>
                        ) : (
                          <div className="flex items-center space-x-2 bg-white border border-[#E5E7EB] rounded-xl p-1 shadow-2xs">
                            <button
                              type="button"
                              onClick={() => updateQuantity(tier.id, -1, maxOrder)}
                              disabled={qty <= 0}
                              aria-label={`Decrease ${tier.name} quantity`}
                              className="w-7 h-7 rounded-lg bg-slate-50 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-slate-50 text-[#111827] flex items-center justify-center font-bold text-xs cursor-pointer transition-colors"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="w-6 text-center text-xs font-bold text-[#111827]">
                              {qty}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateQuantity(tier.id, 1, maxOrder)}
                              disabled={qty >= maxOrder}
                              aria-label={`Increase ${tier.name} quantity`}
                              className="w-7 h-7 rounded-lg bg-purple-50 hover:bg-purple-100 disabled:opacity-30 disabled:hover:bg-purple-50 text-[#6D28D9] flex items-center justify-center font-bold text-xs cursor-pointer transition-colors"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="bg-red-50 border border-red-200 text-[#DC2626] p-3 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Order Summary & Hold Trigger */}
            <div className="pt-4 border-t border-[#E5E7EB] space-y-3">
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-[#64748B]">
                  <span>Subtotal ({totalTicketsSelected} tickets)</span>
                  <span className="text-[#111827] font-semibold">{formatINR(subtotal)}</span>
                </div>
                <div className="flex justify-between text-[#64748B]">
                  <span>Convenience Fee & GST (5%)</span>
                  <span className="text-[#111827] font-semibold">{formatINR(fees)}</span>
                </div>
                <div className="flex justify-between text-sm font-black text-[#111827] pt-2 border-t border-[#E5E7EB]">
                  <span>Total Payable</span>
                  <span className="text-[#6D28D9] text-base">{formatINR(totalAmount)}</span>
                </div>
              </div>

              {/* Reserve Button */}
              <button
                onClick={handleReserve}
                disabled={loading || totalTicketsSelected <= 0}
                className="w-full bg-[#6D28D9] hover:bg-[#5b21b6] disabled:opacity-50 disabled:hover:bg-[#6D28D9] text-white py-3.5 px-4 rounded-xl text-xs sm:text-sm font-bold shadow-md transition-all flex items-center justify-center space-x-2 cursor-pointer"
              >
                {loading ? (
                  <span>Securing 10-Min Hold in Database...</span>
                ) : (
                  <>
                    <span>Hold Tickets for 10 Minutes</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="flex items-center justify-center space-x-1.5 text-[11px] text-[#64748B]">
                <Lock className="w-3.5 h-3.5 text-[#15803D]" />
                <span>Zero Risk: Tickets held for 10 minutes with auto-release</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
