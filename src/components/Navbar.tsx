/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { User, Role } from '../types.ts';
import {
  Ticket,
  Search,
  Bell,
  Sparkles,
  LayoutDashboard,
  ShieldCheck,
  ScanLine,
  LogOut,
  ChevronDown,
  Menu,
  X,
  Clock,
  MapPin,
  PlusCircle,
  GraduationCap,
  Music,
  Briefcase,
  Code,
} from 'lucide-react';

export const INDIAN_CITIES = [
  'Chennai',
  'Coimbatore',
  'Madurai',
  'Tiruchirappalli',
  'Bengaluru',
  'Hyderabad',
  'Mumbai',
  'Pune',
  'New Delhi',
  'Kolkata',
  'Kochi',
  'Thiruvananthapuram',
  'Ahmedabad',
  'Jaipur',
  'Puducherry',
];

interface NavbarProps {
  user: User | null;
  activeHoldSeconds: number | null;
  selectedCity?: string;
  onSelectCity?: (city: string) => void;
  onNavigate: (view: string, data?: any) => void;
  onLoginPersona: (role: Role) => void;
  onOpenAuth: (initialMode?: 'login' | 'register') => void;
  onLogout: () => void;
  currentView: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  activeHoldSeconds,
  selectedCity = 'Chennai',
  onSelectCity,
  onNavigate,
  onLoginPersona,
  onOpenAuth,
  onLogout,
  currentView,
}) => {
  const [showPersonaMenu, setShowPersonaMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [currentCity, setCurrentCity] = useState(selectedCity);

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCityChange = (newCity: string) => {
    setCurrentCity(newCity);
    if (onSelectCity) {
      onSelectCity(newCity);
    }
    onNavigate('explore', { city: newCity });
  };

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-[#E5E7EB] shadow-xs">
      <div className="w-full max-w-7xl 2xl:max-w-[1480px] mx-auto px-3 sm:px-4 lg:px-6 h-18 flex items-center justify-between gap-2">
        {/* Left: Brand Logo & Title */}
        <div className="flex items-center space-x-2.5 lg:space-x-3 shrink-0">
          <button
            onClick={() => onNavigate('home')}
            className="flex items-center space-x-2.5 text-left group cursor-pointer"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#6D28D9] flex items-center justify-center shadow-md shadow-purple-500/20 group-hover:bg-[#5b21b6] transition-colors relative shrink-0">
              <Ticket className="w-5 h-5 text-white transform -rotate-12" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-lg sm:text-xl font-extrabold tracking-tight text-[#172033]">
                  EVENTORA
                </span>
                {/* Subtle Modern Indian Micro-Accent */}
                <div className="flex items-center gap-0.5 ml-0.5" title="Proudly engineered for Indian live experiences">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-200 border border-slate-300" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#15803D]" />
                </div>
              </div>
              <span className="text-[9px] font-bold tracking-wider text-[#64748B] block -mt-0.5 uppercase">
                EVENT DISCOVERY & TICKETING
              </span>
            </div>
          </button>

          {/* Indian City Selector Dropdown */}
          <div className="hidden lg:flex items-center">
            <div className="flex items-center space-x-1.5 bg-[#FFFDF8] hover:bg-slate-50 border border-[#E5E7EB] px-2.5 py-1 rounded-xl text-xs font-semibold text-[#172033] transition-colors">
              <MapPin className="w-3.5 h-3.5 text-[#EA580C]" />
              <select
                value={currentCity}
                onChange={(e) => handleCityChange(e.target.value)}
                className="bg-transparent text-xs font-bold text-[#172033] focus:outline-none cursor-pointer pr-1"
                aria-label="Select City"
              >
                {INDIAN_CITIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Center Navigation Links (Desktop) */}
        <nav className="hidden xl:flex items-center space-x-0.5 text-xs font-semibold">
          <button
            onClick={() => onNavigate('explore')}
            className={`px-3 py-2 rounded-lg transition-all cursor-pointer ${
              currentView === 'explore'
                ? 'bg-purple-50 text-[#6D28D9] font-bold'
                : 'text-[#4B5563] hover:text-[#6D28D9] hover:bg-slate-50'
            }`}
          >
            Explore Events
          </button>

          <button
            onClick={() => onNavigate('explore', { category: 'College Festivals' })}
            className="px-2.5 py-2 rounded-lg text-[#4B5563] hover:text-[#6D28D9] hover:bg-purple-50/60 transition-all cursor-pointer flex items-center gap-1"
          >
            <GraduationCap className="w-3.5 h-3.5 text-[#EA580C]" />
            <span>College Festivals</span>
          </button>

          <button
            onClick={() => onNavigate('explore', { category: 'Concerts' })}
            className="px-2.5 py-2 rounded-lg text-[#4B5563] hover:text-[#6D28D9] hover:bg-purple-50/60 transition-all cursor-pointer flex items-center gap-1"
          >
            <Music className="w-3.5 h-3.5 text-[#8B5CF6]" />
            <span>Concerts</span>
          </button>

          <button
            onClick={() => onNavigate('explore', { category: 'Conferences' })}
            className="px-2.5 py-2 rounded-lg text-[#4B5563] hover:text-[#6D28D9] hover:bg-purple-50/60 transition-all cursor-pointer flex items-center gap-1"
          >
            <Briefcase className="w-3.5 h-3.5 text-[#15803D]" />
            <span>Conferences</span>
          </button>

          <button
            onClick={() => onNavigate('explore', { category: 'Hackathons' })}
            className="px-2.5 py-2 rounded-lg text-[#4B5563] hover:text-[#6D28D9] hover:bg-purple-50/60 transition-all cursor-pointer flex items-center gap-1"
          >
            <Code className="w-3.5 h-3.5 text-[#6D28D9]" />
            <span>Hackathons</span>
          </button>

          <button
            onClick={() => onNavigate('tickets')}
            className={`px-3 py-2 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              currentView === 'tickets'
                ? 'bg-purple-50 text-[#6D28D9] font-bold'
                : 'text-[#4B5563] hover:text-[#6D28D9] hover:bg-slate-50'
            }`}
          >
            <Ticket className="w-3.5 h-3.5 text-[#8B5CF6]" />
            <span>My Tickets</span>
          </button>

          {(user?.role === 'ORGANIZER' || user?.role === 'ADMIN') && (
            <button
              onClick={() => onNavigate('organizer')}
              className={`px-2.5 py-2 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                currentView === 'organizer'
                  ? 'bg-purple-50 text-[#6D28D9] font-bold'
                  : 'text-[#4B5563] hover:text-[#6D28D9] hover:bg-slate-50'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5 text-[#6D28D9]" />
              <span>Studio</span>
            </button>
          )}

          {user?.role === 'ADMIN' && (
            <button
              onClick={() => onNavigate('admin')}
              className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                currentView === 'admin'
                  ? 'bg-purple-100 text-[#6D28D9] border border-purple-200 font-bold'
                  : 'text-[#4B5563] hover:text-[#6D28D9] hover:bg-slate-50'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-[#15803D]" />
              <span>Admin Hub</span>
            </button>
          )}

          {(user?.role === 'ORGANIZER' || user?.role === 'ADMIN') && (
            <button
              onClick={() => onNavigate('verifier')}
              className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                currentView === 'verifier'
                  ? 'bg-purple-50 text-[#6D28D9] font-bold'
                  : 'text-[#4B5563] hover:text-[#6D28D9] hover:bg-slate-50'
              }`}
            >
              <ScanLine className="w-3.5 h-3.5 text-[#D97706]" />
              <span>Door Scanner</span>
            </button>
          )}
        </nav>

        {/* Right Action Bar */}
        <div className="flex items-center space-x-2 sm:space-x-2.5 shrink-0">
          {/* Active 10-Minute Hold Badge */}
          {activeHoldSeconds !== null && activeHoldSeconds > 0 && (
            <button
              onClick={() => onNavigate('checkout')}
              className="flex items-center space-x-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-300 text-[#D97706] px-3 py-1.5 rounded-full text-xs font-bold animate-pulse cursor-pointer shadow-xs transition-colors"
              title="Click to resume your 10-minute checkout hold"
            >
              <Clock className="w-3.5 h-3.5 text-[#D97706]" />
              <span>Hold: {formatCountdown(activeHoldSeconds)}</span>
            </button>
          )}

          {/* Search Icon Shortcut */}
          <button
            onClick={() => onNavigate('explore')}
            className="p-2 text-[#64748B] hover:text-[#6D28D9] hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            aria-label="Search events"
            title="Search events"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Notifications Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 text-[#64748B] hover:text-[#6D28D9] hover:bg-slate-100 rounded-lg transition-colors cursor-pointer relative"
              aria-label="Notifications"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#6D28D9]"></span>
            </button>

            {showNotifications && (
              <div
                className="absolute right-0 mt-2 w-72 bg-white border border-[#E5E7EB] rounded-2xl shadow-xl p-3 z-50 text-left"
                onMouseLeave={() => setShowNotifications(false)}
              >
                <div className="flex items-center justify-between pb-2 border-b border-[#E5E7EB]">
                  <span className="text-xs font-bold text-[#111827]">Live Notifications</span>
                  <span className="text-[10px] text-[#6D28D9] font-semibold bg-purple-50 px-2 py-0.5 rounded-full">
                    Active
                  </span>
                </div>
                <div className="py-2 space-y-2 text-xs">
                  <div className="p-2 bg-slate-50 rounded-lg">
                    <p className="font-semibold text-[#111827]">⚡ Instant QR Ticket Delivery</p>
                    <p className="text-[11px] text-[#64748B] mt-0.5">
                      Confirmed tickets include HMAC SHA-256 passes ready for venue scanning.
                    </p>
                  </div>
                  <div className="p-2 bg-purple-50/50 rounded-lg">
                    <p className="font-semibold text-[#6D28D9]">🔒 10-Min Hold Engine</p>
                    <p className="text-[11px] text-[#64748B] mt-0.5">
                      Inventory is guarded by ACID row-level locks with UPI instant checkout.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Test Persona Quick Switcher */}
          <div className="relative">
            <button
              onClick={() => setShowPersonaMenu(!showPersonaMenu)}
              className="hidden lg:flex items-center space-x-1.5 bg-slate-50 hover:bg-purple-50 text-[#4B5563] hover:text-[#6D28D9] text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-[#E5E7EB] transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#6D28D9]" />
              <span>Personas</span>
              <ChevronDown className="w-3 h-3 text-[#64748B]" />
            </button>

            {showPersonaMenu && (
              <div
                className="absolute right-0 mt-2 w-72 bg-white border border-[#E5E7EB] rounded-2xl shadow-xl p-2 z-50"
                onMouseLeave={() => setShowPersonaMenu(false)}
              >
                <div className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#64748B] border-b border-[#E5E7EB]">
                  Switch Test Persona
                </div>
                <button
                  onClick={() => {
                    onLoginPersona('ATTENDEE');
                    setShowPersonaMenu(false);
                  }}
                  className="w-full text-left p-2.5 rounded-xl text-xs hover:bg-slate-50 text-[#111827] flex items-center justify-between cursor-pointer"
                >
                  <div>
                    <div className="font-bold text-[#111827]">Praveen Devaraj</div>
                    <div className="text-[11px] text-[#64748B]">praveendevaraj2006@gmail.com</div>
                  </div>
                  <span className="bg-emerald-50 text-[#15803D] border border-emerald-200 text-[10px] px-2 py-0.5 rounded-full font-bold">
                    ATTENDEE
                  </span>
                </button>
                <button
                  onClick={() => {
                    onLoginPersona('ORGANIZER');
                    setShowPersonaMenu(false);
                  }}
                  className="w-full text-left p-2.5 rounded-xl text-xs hover:bg-slate-50 text-[#111827] flex items-center justify-between cursor-pointer"
                >
                  <div>
                    <div className="font-bold text-[#111827]">Vikramaditya Singhania</div>
                    <div className="text-[11px] text-[#64748B]">apex@events.in (Apex)</div>
                  </div>
                  <span className="bg-purple-50 text-[#6D28D9] border border-purple-200 text-[10px] px-2 py-0.5 rounded-full font-bold">
                    ORGANIZER
                  </span>
                </button>
                <button
                  onClick={() => {
                    onLoginPersona('ADMIN');
                    setShowPersonaMenu(false);
                  }}
                  className="w-full text-left p-2.5 rounded-xl text-xs hover:bg-slate-50 text-[#111827] flex items-center justify-between cursor-pointer"
                >
                  <div>
                    <div className="font-bold text-[#111827]">Dr. Rajeshwari Iyer</div>
                    <div className="text-[11px] text-[#64748B]">admin@eventora.in</div>
                  </div>
                  <span className="bg-violet-50 text-[#8B5CF6] border border-violet-200 text-[10px] px-2 py-0.5 rounded-full font-bold">
                    ADMIN
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* Prominent "Organize an Event" CTA Button */}
          <button
            onClick={() => {
              if (user?.role === 'ORGANIZER' || user?.role === 'ADMIN') {
                onNavigate('organizer');
              } else {
                onLoginPersona('ORGANIZER');
              }
            }}
            className="hidden sm:inline-flex items-center space-x-1.5 bg-[#6D28D9] hover:bg-[#5b21b6] text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-xs hover:shadow-md transition-all cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Organize an Event</span>
          </button>

          {/* User Profile Menu or Sign In CTA */}
          {user ? (
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center space-x-2 bg-white hover:bg-slate-50 border border-[#E5E7EB] hover:border-purple-300 px-2.5 py-1.5 rounded-xl text-sm text-[#111827] transition-all cursor-pointer shadow-2xs"
              >
                <div className="w-6 h-6 rounded-full bg-[#6D28D9] flex items-center justify-center text-xs font-bold text-white">
                  {user.name.charAt(0)}
                </div>
                <span className="font-semibold hidden sm:inline text-xs text-[#111827]">
                  {user.name.split(' ')[0]}
                </span>
                <span
                  className={`text-[9px] px-2 py-0.5 rounded-full font-extrabold uppercase tracking-wider ${
                    user.role === 'ADMIN'
                      ? 'bg-violet-50 text-[#8B5CF6] border border-violet-200'
                      : user.role === 'ORGANIZER'
                      ? 'bg-purple-50 text-[#6D28D9] border border-purple-200'
                      : 'bg-emerald-50 text-[#15803D] border border-emerald-200'
                  }`}
                >
                  {user.role}
                </span>
                <ChevronDown className="w-3 h-3 text-[#64748B]" />
              </button>

              {showUserMenu && (
                <div
                  className="absolute right-0 mt-2 w-64 bg-white border border-[#E5E7EB] rounded-2xl shadow-xl p-2 z-50 text-left"
                  onMouseLeave={() => setShowUserMenu(false)}
                >
                  <div className="px-3 py-2 border-b border-[#E5E7EB] text-xs">
                    <div className="font-bold text-[#111827]">{user.name}</div>
                    <div className="text-[#64748B] truncate text-[11px]">{user.email}</div>
                    {user.organizationName && (
                      <div className="text-[#6D28D9] font-semibold mt-0.5 text-[11px]">
                        {user.organizationName}
                      </div>
                    )}
                  </div>
                  <div className="py-1">
                    <button
                      onClick={() => {
                        onNavigate('tickets');
                        setShowUserMenu(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs text-[#374151] hover:bg-purple-50 hover:text-[#6D28D9] rounded-lg flex items-center gap-2 cursor-pointer transition-colors"
                    >
                      <Ticket className="w-3.5 h-3.5 text-[#8B5CF6]" />
                      My Bookings & Tickets
                    </button>
                    {(user.role === 'ORGANIZER' || user.role === 'ADMIN') && (
                      <button
                        onClick={() => {
                          onNavigate('organizer');
                          setShowUserMenu(false);
                        }}
                        className="w-full text-left px-3 py-2 text-xs text-[#374151] hover:bg-purple-50 hover:text-[#6D28D9] rounded-lg flex items-center gap-2 cursor-pointer transition-colors"
                      >
                        <LayoutDashboard className="w-3.5 h-3.5 text-[#6D28D9]" />
                        Organizer Studio
                      </button>
                    )}
                    {user.role === 'ADMIN' && (
                      <button
                        onClick={() => {
                          onNavigate('admin');
                          setShowUserMenu(false);
                        }}
                        className="w-full text-left px-3 py-2 text-xs text-[#374151] hover:bg-purple-50 hover:text-[#6D28D9] rounded-lg flex items-center gap-2 cursor-pointer transition-colors"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-[#15803D]" />
                        Admin Control Hub
                      </button>
                    )}
                    <button
                      onClick={() => {
                        onLogout();
                        setShowUserMenu(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs text-[#DC2626] hover:bg-red-50 rounded-lg flex items-center gap-2 mt-1 cursor-pointer transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5 text-[#DC2626]" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <button
                onClick={() => onOpenAuth('login')}
                className="text-[#4B5563] hover:text-[#6D28D9] text-xs font-bold px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Sign In
              </button>
              <button
                onClick={() => onOpenAuth('register')}
                className="bg-[#6D28D9] hover:bg-[#5b21b6] text-white text-xs font-bold px-3.5 py-2 rounded-lg shadow-sm transition-all cursor-pointer"
              >
                Register
              </button>
            </div>
          )}

          {/* Mobile Menu Toggle Button */}
          <button
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className="xl:hidden p-2 text-[#4B5563] hover:text-[#6D28D9] hover:bg-slate-50 rounded-lg cursor-pointer"
            aria-label="Toggle Navigation Menu"
          >
            {showMobileMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {showMobileMenu && (
        <div className="xl:hidden border-t border-[#E5E7EB] bg-white px-4 pt-3 pb-5 space-y-2">
          {/* Mobile City Selector */}
          <div className="flex items-center space-x-2 bg-[#FFFDF8] border border-[#E5E7EB] p-2.5 rounded-xl text-xs mb-3">
            <MapPin className="w-4 h-4 text-[#EA580C]" />
            <span className="font-semibold text-[#64748B]">City:</span>
            <select
              value={currentCity}
              onChange={(e) => handleCityChange(e.target.value)}
              className="bg-transparent text-xs font-bold text-[#172033] focus:outline-none flex-1"
            >
              {INDIAN_CITIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => {
              onNavigate('explore');
              setShowMobileMenu(false);
            }}
            className="w-full text-left px-3 py-2 text-sm font-semibold text-[#111827] hover:bg-purple-50 hover:text-[#6D28D9] rounded-lg"
          >
            Explore Events
          </button>
          <button
            onClick={() => {
              onNavigate('explore', { category: 'College Festivals' });
              setShowMobileMenu(false);
            }}
            className="w-full text-left px-3 py-2 text-sm font-semibold text-[#111827] hover:bg-purple-50 hover:text-[#6D28D9] rounded-lg flex items-center gap-2"
          >
            <GraduationCap className="w-4 h-4 text-[#EA580C]" />
            <span>College Festivals</span>
          </button>
          <button
            onClick={() => {
              onNavigate('explore', { category: 'Concerts' });
              setShowMobileMenu(false);
            }}
            className="w-full text-left px-3 py-2 text-sm font-semibold text-[#111827] hover:bg-purple-50 hover:text-[#6D28D9] rounded-lg flex items-center gap-2"
          >
            <Music className="w-4 h-4 text-[#8B5CF6]" />
            <span>Concerts</span>
          </button>
          <button
            onClick={() => {
              onNavigate('explore', { category: 'Conferences' });
              setShowMobileMenu(false);
            }}
            className="w-full text-left px-3 py-2 text-sm font-semibold text-[#111827] hover:bg-purple-50 hover:text-[#6D28D9] rounded-lg flex items-center gap-2"
          >
            <Briefcase className="w-4 h-4 text-[#15803D]" />
            <span>Conferences</span>
          </button>
          <button
            onClick={() => {
              onNavigate('explore', { category: 'Hackathons' });
              setShowMobileMenu(false);
            }}
            className="w-full text-left px-3 py-2 text-sm font-semibold text-[#111827] hover:bg-purple-50 hover:text-[#6D28D9] rounded-lg flex items-center gap-2"
          >
            <Code className="w-4 h-4 text-[#6D28D9]" />
            <span>Hackathons</span>
          </button>
          <button
            onClick={() => {
              onNavigate('tickets');
              setShowMobileMenu(false);
            }}
            className="w-full text-left px-3 py-2 text-sm font-semibold text-[#111827] hover:bg-purple-50 hover:text-[#6D28D9] rounded-lg flex items-center justify-between"
          >
            <span>My Tickets</span>
            <Ticket className="w-4 h-4 text-[#8B5CF6]" />
          </button>

          <button
            onClick={() => {
              if (user?.role === 'ORGANIZER' || user?.role === 'ADMIN') {
                onNavigate('organizer');
              } else {
                onLoginPersona('ORGANIZER');
              }
              setShowMobileMenu(false);
            }}
            className="w-full text-left px-3 py-2 text-sm font-bold text-white bg-[#6D28D9] rounded-lg flex items-center justify-between mt-2"
          >
            <span>Organize an Event</span>
            <PlusCircle className="w-4 h-4" />
          </button>
        </div>
      )}
    </header>
  );
};
