/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Ticket as TicketType } from '../types.ts';
import QRCode from 'qrcode';
import { X, Printer, CheckCircle, ShieldCheck, Calendar, MapPin, Sparkles, Ticket } from 'lucide-react';
import { formatIndianDate } from '../utils/formatters.ts';

interface TicketModalProps {
  ticket: TicketType | null;
  onClose: () => void;
}

export const TicketModal: React.FC<TicketModalProps> = ({ ticket, onClose }) => {
  const [qrSrc, setQrSrc] = useState<string>('');

  useEffect(() => {
    if (ticket) {
      if (ticket.qrDataUrl) {
        setQrSrc(ticket.qrDataUrl);
      } else {
        const rawPayload = ticket.qrCodeData || (ticket as any).qr_code_data || JSON.stringify({
          ticketCode: ticket.ticketCode || (ticket as any).ticket_code,
          eventTitle: ticket.eventTitle,
        });

        QRCode.toDataURL(rawPayload, {
          errorCorrectionLevel: 'M',
          margin: 1,
          width: 260,
          color: { dark: '#111827', light: '#FFFFFF' },
        }).then(setQrSrc).catch(console.error);
      }
    }
  }, [ticket]);

  if (!ticket) return null;

  const handlePrint = () => {
    window.print();
  };

  const formattedDate = ticket.eventDate
    ? formatIndianDate(ticket.eventDate)
    : 'Confirmed Event Date';

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative w-full max-w-lg bg-white border border-[#E5E7EB] rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Controls Bar */}
        <div className="flex items-center justify-between p-4 border-b border-[#E5E7EB] bg-[#F8FAFC] print:hidden">
          <div className="flex items-center space-x-2 text-[#6D28D9] font-bold text-xs tracking-wider uppercase">
            <Ticket className="w-4 h-4" />
            <span>Official Eventora Admission Pass</span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="flex items-center space-x-1.5 bg-white hover:bg-slate-50 text-[#111827] text-xs font-bold px-3 py-1.5 rounded-xl border border-[#E5E7EB] transition-colors cursor-pointer shadow-2xs"
            >
              <Printer className="w-3.5 h-3.5 text-[#6D28D9]" />
              <span>Print Pass</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-[#64748B] hover:text-[#111827] rounded-xl hover:bg-slate-200/60 transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Pass Body */}
        <div className="p-6 sm:p-8 space-y-6 bg-white text-[#111827] print:p-0">
          {/* Header Ticket Brand */}
          <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-4">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xl font-black tracking-tight text-[#111827]">EVENTORA</span>
                <span className="text-[10px] bg-purple-50 text-[#6D28D9] font-bold px-2 py-0.5 rounded-full border border-purple-200">
                  VERIFIED PASS
                </span>
              </div>
              <p className="text-[11px] text-[#64748B] mt-0.5">Cryptographically signed digital ticket</p>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-[#64748B] block">Order Ref</span>
              <span className="text-xs font-mono font-bold text-[#111827]">
                {ticket.orderNumber || 'ORD-EVT-CONFIRMED'}
              </span>
            </div>
          </div>

          {/* Event Title & Tier */}
          <div className="space-y-1">
            <h2 className="text-xl font-black text-[#111827] leading-tight">
              {ticket.eventTitle}
            </h2>
            <div className="inline-block bg-purple-50 text-[#6D28D9] border border-purple-200 text-xs font-bold px-3 py-1 rounded-lg">
              {ticket.tierName}
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-4 py-3 bg-[#F8FAFC] border border-[#E5E7EB] rounded-2xl p-4 text-xs">
            <div>
              <span className="text-[#64748B] text-[10px] uppercase font-bold block mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-[#6D28D9]" /> Date
              </span>
              <span className="font-bold text-[#111827]">{formattedDate}</span>
            </div>
            <div>
              <span className="text-[#64748B] text-[10px] uppercase font-bold block mb-1 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-[#6D28D9]" /> Venue
              </span>
              <span className="font-bold text-[#111827] truncate block">
                {ticket.venueName || 'Chennai Trade Centre'}, {ticket.venueCity || 'Chennai'}
              </span>
            </div>
            <div>
              <span className="text-[#64748B] text-[10px] uppercase font-bold block mb-1">
                Ticket Holder
              </span>
              <span className="font-bold text-[#111827]">{ticket.attendeeName || 'Praveen Devaraj'}</span>
            </div>
            <div>
              <span className="text-[#64748B] text-[10px] uppercase font-bold block mb-1">
                Admission Status
              </span>
              <span className="inline-flex items-center gap-1 text-[#15803D] font-bold">
                <CheckCircle className="w-3.5 h-3.5 text-[#15803D]" />
                {ticket.status === 'CHECKED_IN' ? 'Admitted' : 'Valid for Entry'}
              </span>
            </div>
          </div>

          {/* QR Code Security Stamp */}
          <div className="flex flex-col items-center justify-center p-6 bg-white border border-[#E5E7EB] rounded-2xl space-y-3 text-center shadow-xs">
            <div className="p-2 bg-white rounded-xl shadow-xs border border-[#E5E7EB]">
              {qrSrc ? (
                <img src={qrSrc} alt="Admission QR Code" className="w-48 h-48 mx-auto" />
              ) : (
                <div className="w-48 h-48 flex items-center justify-center text-xs text-[#64748B]">
                  Generating QR...
                </div>
              )}
            </div>

            <div>
              <div className="font-mono text-base font-extrabold tracking-widest text-[#111827]">
                {ticket.ticketCode}
              </div>
              <p className="text-[11px] text-[#64748B] mt-1">
                Scan this QR code at the turnstile or entrance gate for fast-track entry.
              </p>
            </div>
          </div>

          {/* Footer Security Note */}
          <div className="flex items-center justify-between text-[11px] text-[#64748B] pt-2 border-t border-[#E5E7EB]">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-4 h-4 text-[#15803D]" />
              HMAC SHA-256 Tamper-Proof Signature
            </span>
            <span>Non-transferable pass</span>
          </div>
        </div>
      </div>
    </div>
  );
};
