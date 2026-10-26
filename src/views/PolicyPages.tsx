/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { X, Shield, FileText } from 'lucide-react';

interface PolicyModalProps {
  type: 'privacy' | 'terms' | null;
  onClose: () => void;
}

export const PolicyModal: React.FC<PolicyModalProps> = ({ type, onClose }) => {
  if (!type) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-[#E5E7EB] rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl relative space-y-4 max-h-[85vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-[#64748B] hover:text-[#111827] p-1 rounded-lg cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {type === 'privacy' ? (
          <div className="space-y-4 text-xs text-[#4B5563] leading-relaxed">
            <div className="flex items-center space-x-2 text-[#6D28D9]">
              <Shield className="w-5 h-5" />
              <h2 className="text-xl font-black text-[#111827]">Privacy Policy</h2>
            </div>
            <p>
              Eventora takes data privacy and tenant boundary protection with utmost seriousness. All passwords are encrypted with salted one-way hashes, and authentication tokens are rotated via HttpOnly cookie and Bearer protocol standards.
            </p>
            <h3 className="text-sm font-bold text-[#111827] pt-2">1. Data Collected</h3>
            <p>
              We collect user name, email, organizer brand identifiers, order transaction receipts, and digital admission pass signatures required for gate check-in verification.
            </p>
            <h3 className="text-sm font-bold text-[#111827] pt-2">2. Tenant Isolation & Confidentiality</h3>
            <p>
              Event attendee rosters, sales volumes, and revenue metrics are strictly isolated per organizer tenant. No organizer is permitted access to competing organizers&apos; confidential customer records.
            </p>
            <h3 className="text-sm font-bold text-[#111827] pt-2">3. Mock Payment Simulation</h3>
            <p>
              This environment runs asynchronous payment simulation for testing and verification purposes. No actual credit card numbers, CVVs, or bank logins are requested or retained.
            </p>
          </div>
        ) : (
          <div className="space-y-4 text-xs text-[#4B5563] leading-relaxed">
            <div className="flex items-center space-x-2 text-[#6D28D9]">
              <FileText className="w-5 h-5" />
              <h2 className="text-xl font-black text-[#111827]">Terms & Conditions</h2>
            </div>
            <p>
              By reserving tickets or managing events on the Eventora multi-tenant platform, organizers and attendees agree to the following terms:
            </p>
            <h3 className="text-sm font-bold text-[#111827] pt-2">1. 10-Minute Reservation Hold Policy</h3>
            <p>
              When an attendee reserves ticket inventory, our database enforces a strict 10-minute hold window. If payment checkout is not finalized within 10 minutes, held inventory is automatically reclaimed by the background reconciliation worker and restored to public availability.
            </p>
            <h3 className="text-sm font-bold text-[#111827] pt-2">2. Concurrency & Overselling Guarantee</h3>
            <p>
              Eventora enforces database row-level locking. In the event of simultaneous demand exceeding available capacity, transactions are evaluated atomically; excess requests receive immediate HTTP 409 Conflict notifications and will not be overbooked.
            </p>
            <h3 className="text-sm font-bold text-[#111827] pt-2">3. Ticket Authenticity & Door Verification</h3>
            <p>
              Digital tickets are cryptographically validated. Duplication, unauthorized transfer, or counterfeit admission attempts will be flagged by gate scanner verifiers.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
