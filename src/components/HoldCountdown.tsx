/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Clock, AlertTriangle, XCircle, ShieldCheck } from 'lucide-react';

interface HoldCountdownProps {
  expiresAt: string;
  onExpired: () => void;
  onRelease?: () => void;
}

export const HoldCountdown: React.FC<HoldCountdownProps> = ({ expiresAt, onExpired, onRelease }) => {
  const calculateRemaining = () => {
    const diff = Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000);
    return Math.max(0, diff);
  };

  const [secondsLeft, setSecondsLeft] = useState(calculateRemaining);

  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = calculateRemaining();
      setSecondsLeft(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        onExpired();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, onExpired]);

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const isUrgent = secondsLeft < 120; // < 2 minutes
  const totalHold = 600; // 10 minutes = 600s
  const percentLeft = Math.min(100, Math.max(0, (secondsLeft / totalHold) * 100));

  return (
    <div
      className={`rounded-2xl p-4 sm:p-5 border transition-all ${
        isUrgent
          ? 'bg-red-50/70 border-red-200 shadow-sm text-[#DC2626]'
          : 'bg-amber-50/70 border-amber-200 shadow-sm text-[#D97706]'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
        <div className="flex items-center space-x-2.5">
          <div className={`p-2 rounded-xl ${isUrgent ? 'bg-red-100 text-[#DC2626]' : 'bg-amber-100 text-[#D97706]'}`}>
            {isUrgent ? (
              <AlertTriangle className="w-5 h-5 animate-bounce" />
            ) : (
              <Clock className="w-5 h-5" />
            )}
          </div>
          <div>
            <div className={`text-sm font-bold tracking-wide uppercase ${isUrgent ? 'text-[#DC2626]' : 'text-[#D97706]'}`}>
              {isUrgent ? 'Hold Expiring Soon — Complete Payment' : '10-Minute Ticket Hold Guaranteed'}
            </div>
            <div className="text-xs text-[#64748B]">
              Your selected inventory is locked exclusively for this checkout session.
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3 self-end sm:self-center">
          <div className={`font-mono text-2xl font-black px-3.5 py-1 rounded-xl shadow-xs border ${
            isUrgent
              ? 'bg-white border-red-200 text-[#DC2626]'
              : 'bg-white border-amber-200 text-[#D97706]'
          }`}>
            {mins}:{secs.toString().padStart(2, '0')}
          </div>

          {onRelease && (
            <button
              onClick={onRelease}
              className="text-xs text-[#64748B] hover:text-[#DC2626] font-semibold transition-colors flex items-center gap-1 cursor-pointer bg-white border border-[#E5E7EB] hover:border-red-200 px-2.5 py-2 rounded-xl shadow-2xs"
              title="Release tickets back to other attendees"
            >
              <XCircle className="w-3.5 h-3.5 text-[#DC2626]" />
              <span className="hidden sm:inline">Release</span>
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-white rounded-full h-2 overflow-hidden border border-[#E5E7EB]">
        <div
          className={`h-full transition-all duration-1000 ${isUrgent ? 'bg-[#DC2626]' : 'bg-[#D97706]'}`}
          style={{ width: `${percentLeft}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-[11px] text-[#64748B] mt-2">
        <span className="flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-[#15803D]" />
          Protected against concurrent overbooking
        </span>
        <span>Reconciled automatically by background worker</span>
      </div>
    </div>
  );
};
