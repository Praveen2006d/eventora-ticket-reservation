/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { api } from '../api.ts';
import {
  ScanLine,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Search,
  User,
  Calendar,
  Sparkles,
} from 'lucide-react';

export const TicketVerifierView: React.FC = () => {
  const [ticketCode, setTicketCode] = useState('EVT-AI26-SC01');
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleVerify = async (markCheckedIn: boolean) => {
    if (!ticketCode.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await api.verifyTicket(ticketCode.trim(), markCheckedIn);
      setVerificationResult(res);
    } catch (err: any) {
      setError(err.message || 'Verification failed.');
      setVerificationResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-8 animate-in fade-in duration-200 bg-white">
      <div>
        <div className="inline-flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-[#D97706] bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200 mb-2">
          <ScanLine className="w-3.5 h-3.5" />
          <span>Event Gatekeeper Portal</span>
        </div>
        <h1 className="text-3xl font-black text-[#111827] tracking-tight">
          Door Scanner & Ticket Verifier
        </h1>
        <p className="text-xs text-[#64748B] mt-1">
          Scan QR code payload or enter ticket gate code to verify authenticity and admit attendees.
        </p>
      </div>

      {/* Input Form */}
      <div className="bg-white border border-[#E5E7EB] rounded-3xl p-6 shadow-xs space-y-4">
        <div>
          <label className="text-xs font-bold text-[#111827] block mb-1">
            Ticket Gate Code or QR Data
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1 flex items-center px-3.5 bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl focus-within:border-[#6D28D9] focus-within:bg-white transition-all">
              <Search className="w-4 h-4 text-[#94A3B8] mr-2 shrink-0" />
              <input
                type="text"
                placeholder="e.g. EVT-AI26-SC01"
                value={ticketCode}
                onChange={(e) => setTicketCode(e.target.value)}
                className="w-full py-2.5 text-xs text-[#111827] uppercase font-mono placeholder-[#94A3B8] bg-transparent focus:outline-none"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleVerify(false)}
                disabled={loading || !ticketCode.trim()}
                className="bg-white hover:bg-purple-50 text-[#6D28D9] border border-purple-200 font-bold text-xs px-4 py-2.5 rounded-xl shadow-2xs transition-colors cursor-pointer shrink-0"
              >
                Verify Only
              </button>
              <button
                onClick={() => handleVerify(true)}
                disabled={loading || !ticketCode.trim()}
                className="bg-[#15803D] hover:bg-[#166534] text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-xs transition-colors cursor-pointer shrink-0"
              >
                Check-In & Admit
              </button>
            </div>
          </div>
        </div>

        {/* Quick Sample Selector */}
        <div className="flex items-center space-x-2 text-xs text-[#64748B] pt-1">
          <span>Quick test sample:</span>
          <button
            onClick={() => setTicketCode('EVT-AI26-SC01')}
            className="text-[#6D28D9] hover:underline font-mono text-[11px] font-bold cursor-pointer"
          >
            EVT-AI26-SC01 (Sarah Chen's Seed Ticket)
          </button>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-[#DC2626] text-xs flex items-center gap-2.5">
            <XCircle className="w-4 h-4 text-[#DC2626] shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Verification Result Card */}
      {verificationResult && (
        <div
          className={`rounded-3xl p-6 border shadow-sm space-y-4 animate-in fade-in bg-white ${
            verificationResult.valid
              ? 'border-emerald-300'
              : 'border-red-300'
          }`}
        >
          <div className="flex items-center justify-between pb-4 border-b border-[#E5E7EB]">
            <div className="flex items-center space-x-3">
              {verificationResult.valid ? (
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#15803D] flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-xl bg-red-50 text-[#DC2626] flex items-center justify-center">
                  <XCircle className="w-6 h-6" />
                </div>
              )}
              <div>
                <h3 className="text-base font-bold text-[#111827]">
                  {verificationResult.message}
                </h3>
                <div className="text-xs text-[#64748B]">
                  Status:{' '}
                  <strong
                    className={
                      verificationResult.status === 'VALID'
                        ? 'text-[#15803D]'
                        : verificationResult.status === 'CHECKED_IN'
                        ? 'text-blue-600'
                        : 'text-[#DC2626]'
                    }
                  >
                    {verificationResult.status}
                  </strong>
                </div>
              </div>
            </div>

            <span className="font-mono text-sm font-bold text-[#6D28D9] bg-purple-50 px-3 py-1 rounded-lg border border-purple-200">
              {verificationResult.ticket?.ticket_code}
            </span>
          </div>

          {/* Ticket Metadata */}
          {verificationResult.ticket && (
            <div className="grid grid-cols-2 gap-4 text-xs text-[#64748B] bg-[#F8FAFC] p-4 rounded-2xl border border-[#E5E7EB]">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-[#64748B]">Attendee Name</span>
                <div className="text-[#111827] font-bold flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-[#6D28D9]" />
                  {verificationResult.ticket.attendee_name}
                </div>
                <div className="text-[#64748B] text-[11px]">{verificationResult.ticket.attendee_email}</div>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-[#64748B]">Event & Admission Tier</span>
                <div className="text-[#111827] font-bold truncate">{verificationResult.ticket.event_title}</div>
                <div className="text-[#6D28D9] text-[11px] font-bold">{verificationResult.ticket.tier_name}</div>
              </div>
            </div>
          )}

          {verificationResult.valid && verificationResult.status === 'VALID' && (
            <div className="pt-2 border-t border-[#E5E7EB] flex justify-end">
              <button
                onClick={() => handleVerify(true)}
                className="bg-[#15803D] hover:bg-[#166534] text-white font-bold text-xs px-4 py-2 rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                Admit Attendee & Check-In
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
