/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Ticket, Shield, Lock, Globe, Server, CheckCircle2, PhoneCall, Mail, Headphones } from 'lucide-react';

interface FooterProps {
  onOpenPolicy: (type: 'privacy' | 'terms') => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenPolicy }) => {
  return (
    <footer className="bg-[#F8FAFC] border-t border-[#E5E7EB] text-[#64748B] text-sm mt-auto">
      {/* Trust Highlights Bar */}
      <div className="border-b border-[#E5E7EB] bg-white py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div className="flex items-center justify-center space-x-2.5 p-2">
            <div className="w-8 h-8 rounded-full bg-purple-50 text-[#6D28D9] flex items-center justify-center shrink-0">
              <Lock className="w-4 h-4" />
            </div>
            <div className="text-left">
              <div className="text-xs font-bold text-[#111827]">100% Guaranteed Entry</div>
              <div className="text-[11px] text-[#64748B]">Cryptographically signed passes</div>
            </div>
          </div>

          <div className="flex items-center justify-center space-x-2.5 p-2">
            <div className="w-8 h-8 rounded-full bg-emerald-50 text-[#15803D] flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div className="text-left">
              <div className="text-xs font-bold text-[#111827]">Zero Overselling</div>
              <div className="text-[11px] text-[#64748B]">Atomic row-lock reservation</div>
            </div>
          </div>

          <div className="flex items-center justify-center space-x-2.5 p-2">
            <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Shield className="w-4 h-4" />
            </div>
            <div className="text-left">
              <div className="text-xs font-bold text-[#111827]">Secure Payments</div>
              <div className="text-[11px] text-[#64748B]">UPI, Cards & NetBanking</div>
            </div>
          </div>

          <div className="flex items-center justify-center space-x-2.5 p-2">
            <div className="w-8 h-8 rounded-full bg-amber-50 text-[#D97706] flex items-center justify-center shrink-0">
              <Headphones className="w-4 h-4" />
            </div>
            <div className="text-left">
              <div className="text-xs font-bold text-[#111827]">24/7 Attendee Support</div>
              <div className="text-[11px] text-[#64748B]">support@eventora.in</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Info */}
          <div className="md:col-span-1 space-y-4">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#6D28D9] flex items-center justify-center text-white shadow-xs">
                <Ticket className="w-4 h-4" />
              </div>
              <span className="text-lg font-extrabold text-[#111827] tracking-tight">EVENTORA</span>
            </div>
            <p className="text-xs text-[#64748B] leading-relaxed">
              India’s next-generation event discovery and high-concurrency ticket reservation platform with guaranteed zero overselling.
            </p>
            <div className="flex items-center space-x-2 text-[11px] text-[#15803D] bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full w-fit font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>ACID Row-Lock Concurrency Protected</span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#111827] mb-3">
              Explore Events
            </h4>
            <ul className="space-y-2 text-xs">
              <li><a href="#explore" className="hover:text-[#6D28D9] transition-colors">All Live Events</a></li>
              <li><a href="#festivals" className="hover:text-[#6D28D9] transition-colors">Concerts & Music Fests</a></li>
              <li><a href="#venues" className="hover:text-[#6D28D9] transition-colors">Tech & AI Summits</a></li>
              <li><a href="#verification" className="hover:text-[#6D28D9] transition-colors">Stand-up Comedy & Arts</a></li>
            </ul>
          </div>

          {/* Organizers */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#111827] mb-3">
              Event Organizers
            </h4>
            <ul className="space-y-2 text-xs">
              <li><a href="#studio" className="hover:text-[#6D28D9] transition-colors">Organizer Studio</a></li>
              <li><a href="#tiers" className="hover:text-[#6D28D9] transition-colors">Multi-Tier Ticket Sales</a></li>
              <li><a href="#analytics" className="hover:text-[#6D28D9] transition-colors">Real-time Revenue KPIs</a></li>
              <li><a href="#scanner" className="hover:text-[#6D28D9] transition-colors">On-Site QR Scanner Portal</a></li>
            </ul>
          </div>

          {/* Cities */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#111827] mb-3">
              Popular Cities
            </h4>
            <ul className="space-y-2 text-xs">
              <li className="flex items-center gap-1.5"><Globe className="w-3.5 h-3.5 text-[#6D28D9]" /> Bengaluru (Silicon Plateau)</li>
              <li className="flex items-center gap-1.5"><Globe className="w-3.5 h-3.5 text-[#6D28D9]" /> Mumbai & BKC</li>
              <li className="flex items-center gap-1.5"><Globe className="w-3.5 h-3.5 text-[#6D28D9]" /> Delhi-NCR & Gurugram</li>
              <li className="flex items-center gap-1.5"><Globe className="w-3.5 h-3.5 text-[#6D28D9]" /> Hyderabad & Cyberabad</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-[#E5E7EB] mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-[#64748B]">
          <p>© {new Date().getFullYear()} Eventora Ticketing Technologies Pvt. Ltd. All rights reserved.</p>
          <div className="flex space-x-6 mt-4 sm:mt-0">
            <button
              onClick={() => onOpenPolicy('privacy')}
              className="hover:text-[#6D28D9] transition-colors cursor-pointer"
            >
              Privacy Policy
            </button>
            <button
              onClick={() => onOpenPolicy('terms')}
              className="hover:text-[#6D28D9] transition-colors cursor-pointer"
            >
              Terms of Service
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};
