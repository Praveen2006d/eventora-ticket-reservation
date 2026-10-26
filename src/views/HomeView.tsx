/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { EventItem } from '../types.ts';
import { EventCard } from '../components/EventCard.tsx';
import { formatINR, formatIndianDate } from '../utils/formatters.ts';
import {
  Search,
  MapPin,
  Calendar,
  Sparkles,
  ShieldCheck,
  Zap,
  Clock,
  ArrowRight,
  Flame,
  Lock,
  GraduationCap,
  Music,
  Briefcase,
  Code,
  Compass,
} from 'lucide-react';

interface HomeViewProps {
  events: EventItem[];
  onSelectEvent: (event: EventItem) => void;
  onExplore: (searchParams?: { q?: string; category?: string; city?: string }) => void;
}

const CATEGORIES = [
  'All',
  'College Festivals',
  'Technology',
  'Concerts',
  'Hackathons',
  'Conferences',
  'Cultural Celebrations',
];

const POPULAR_INDIAN_CITIES = [
  'Chennai',
  'Bengaluru',
  'Hyderabad',
  'Mumbai',
  'Coimbatore',
  'Madurai',
  'Pune',
  'New Delhi',
  'Kochi',
  'All Cities',
];

export const HomeView: React.FC<HomeViewProps> = ({ events, onSelectEvent, onExplore }) => {
  const [keyword, setKeyword] = useState('');
  const [city, setCity] = useState('Chennai');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [eventDate, setEventDate] = useState('');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onExplore({
      q: keyword.trim() || undefined,
      city: city !== 'All Cities' && city !== 'All' ? city : undefined,
      category: selectedCategory !== 'All' ? selectedCategory : undefined,
    });
  };

  const featuredEvent = events[0];
  const trendingEvents = events.slice(0, 4);
  const remainingEvents = events.slice(1);

  return (
    <div className="space-y-16 pb-20 bg-white">
      {/* Indian-Inspired Hero Section */}
      <section className="relative overflow-hidden pt-10 pb-16 lg:pt-16 lg:pb-24 bg-[#FFFDF8] border-b border-[#E5E7EB]">
        {/* Subtle Geometric Background Motifs */}
        <div className="absolute inset-0 pointer-events-none opacity-40">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="indian-dots" x="0" y="0" width="36" height="36" patternUnits="userSpaceOnUse">
                <circle cx="18" cy="18" r="1.2" fill="#E5E7EB" />
                <path d="M18 10 L26 18 L18 26 L10 18 Z" fill="none" stroke="#F59E0B" strokeWidth="0.4" strokeOpacity="0.25" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#indian-dots)" />
          </svg>
        </div>

        {/* Soft Radial Ambient Glow */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#FFF0D6]/60 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-purple-50/70 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-6xl mx-auto px-4 text-center relative z-10 space-y-8">
          {/* Top Tricolor Micro-Badge */}
          <div className="inline-flex items-center space-x-2.5 bg-white border border-[#E5E7EB] px-4 py-1.5 rounded-full text-xs text-[#172033] shadow-xs">
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#F59E0B]" />
              <span className="w-2 h-2 rounded-full bg-slate-300" />
              <span className="w-2 h-2 rounded-full bg-[#15803D]" />
            </div>
            <span className="font-bold text-[#6D28D9]">
              India’s Premier Event Discovery & High-Concurrency Ticketing Platform
            </span>
          </div>

          {/* Heading Requested */}
          <div className="space-y-3 max-w-4xl mx-auto">
            <h1 className="text-4xl sm:text-6xl font-black text-[#172033] tracking-tight leading-[1.14]">
              India's Events.{' '}
              <span className="text-[#6D28D9] relative inline-block">
                Your Next Experience.
                <span className="absolute left-0 bottom-1 w-full h-1 bg-gradient-to-r from-[#F59E0B] via-[#8B5CF6] to-[#15803D] rounded-full opacity-60"></span>
              </span>
            </h1>

            <p className="text-base sm:text-lg text-[#64748B] max-w-2xl mx-auto leading-relaxed">
              Discover concerts, college festivals, hackathons, conferences, cultural celebrations, and unforgettable experiences across India.
            </p>
          </div>

          {/* Commercial Search Bar */}
          <form
            onSubmit={handleSearchSubmit}
            className="bg-white border border-[#E5E7EB] p-3 rounded-3xl shadow-xl max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-2 text-left"
          >
            {/* 1. Keyword */}
            <div className="md:col-span-4 flex items-center px-3.5 bg-[#FFFDF8] rounded-2xl border border-[#E5E7EB] focus-within:border-[#6D28D9] focus-within:bg-white transition-all">
              <Search className="w-4 h-4 text-[#94A3B8] mr-2.5 shrink-0" />
              <input
                type="text"
                placeholder="Search event, fest, or hackathon..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="w-full py-2.5 text-xs text-[#172033] placeholder-[#94A3B8] bg-transparent focus:outline-none font-medium"
              />
            </div>

            {/* 2. Indian City Selector (Chennai Default) */}
            <div className="md:col-span-3 flex items-center px-3 bg-[#FFFDF8] rounded-2xl border border-[#E5E7EB] focus-within:border-[#6D28D9] focus-within:bg-white transition-all">
              <MapPin className="w-4 h-4 text-[#EA580C] mr-2 shrink-0" />
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full py-2.5 text-xs text-[#172033] bg-transparent focus:outline-none cursor-pointer font-bold"
              >
                {POPULAR_INDIAN_CITIES.map((c) => (
                  <option key={c} value={c}>
                    {c} {c === 'Chennai' ? '📍' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* 3. Event Category */}
            <div className="md:col-span-3 flex items-center px-3 bg-[#FFFDF8] rounded-2xl border border-[#E5E7EB] focus-within:border-[#6D28D9] focus-within:bg-white transition-all">
              <Compass className="w-4 h-4 text-[#6D28D9] mr-2 shrink-0" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full py-2.5 text-xs text-[#172033] bg-transparent focus:outline-none cursor-pointer font-medium"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* 4. Submit CTA */}
            <div className="md:col-span-2">
              <button
                type="submit"
                className="w-full h-full min-h-[44px] bg-[#6D28D9] hover:bg-[#5b21b6] text-white text-xs font-extrabold rounded-2xl shadow-md shadow-purple-500/20 transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                <span>Explore Events</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>

          {/* Quick City Chips */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 pt-1 text-xs">
            <span className="text-xs font-bold text-[#64748B] mr-1">Popular Indian Hubs:</span>
            {['Chennai', 'Bengaluru', 'Coimbatore', 'Hyderabad', 'Mumbai', 'New Delhi'].map((c) => (
              <button
                key={c}
                onClick={() => {
                  setCity(c);
                  onExplore({ city: c });
                }}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  city === c
                    ? 'bg-[#6D28D9] text-white shadow-xs'
                    : 'bg-white hover:bg-purple-50 text-[#4B5563] hover:text-[#6D28D9] border border-[#E5E7EB]'
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          {/* Visual Showcase Collage of Authentic Indian Experiences */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 max-w-5xl mx-auto pt-6 text-left">
            {/* Collage 1: College Fest */}
            <div
              onClick={() => onExplore({ category: 'College Festivals' })}
              className="group relative rounded-2xl overflow-hidden border border-[#E5E7EB] hover:border-purple-300 shadow-xs cursor-pointer h-36 sm:h-44"
            >
              <img
                src="https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=600&q=80"
                alt="College Festivals"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
              <div className="absolute bottom-3 left-3 right-3 text-white">
                <span className="text-[10px] uppercase font-bold text-[#F59E0B] tracking-wider block">Campus Culture</span>
                <h4 className="text-xs sm:text-sm font-bold leading-tight">College Festivals</h4>
              </div>
            </div>

            {/* Collage 2: Hackathons */}
            <div
              onClick={() => onExplore({ category: 'Hackathons' })}
              className="group relative rounded-2xl overflow-hidden border border-[#E5E7EB] hover:border-purple-300 shadow-xs cursor-pointer h-36 sm:h-44"
            >
              <img
                src="https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=600&q=80"
                alt="Hackathons"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
              <div className="absolute bottom-3 left-3 right-3 text-white">
                <span className="text-[10px] uppercase font-bold text-[#8B5CF6] tracking-wider block">Code & Sprints</span>
                <h4 className="text-xs sm:text-sm font-bold leading-tight">National Hackathons</h4>
              </div>
            </div>

            {/* Collage 3: Concerts */}
            <div
              onClick={() => onExplore({ category: 'Concerts' })}
              className="group relative rounded-2xl overflow-hidden border border-[#E5E7EB] hover:border-purple-300 shadow-xs cursor-pointer h-36 sm:h-44"
            >
              <img
                src="https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=600&q=80"
                alt="Live Concerts"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
              <div className="absolute bottom-3 left-3 right-3 text-white">
                <span className="text-[10px] uppercase font-bold text-[#F59E0B] tracking-wider block">Live Music</span>
                <h4 className="text-xs sm:text-sm font-bold leading-tight">Margazhi & Fusion</h4>
              </div>
            </div>

            {/* Collage 4: Tech Summits */}
            <div
              onClick={() => onExplore({ category: 'Technology' })}
              className="group relative rounded-2xl overflow-hidden border border-[#E5E7EB] hover:border-purple-300 shadow-xs cursor-pointer h-36 sm:h-44"
            >
              <img
                src="https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=600&q=80"
                alt="Technology Summits"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
              <div className="absolute bottom-3 left-3 right-3 text-white">
                <span className="text-[10px] uppercase font-bold text-[#15803D] tracking-wider block">Enterprise AI</span>
                <h4 className="text-xs sm:text-sm font-bold leading-tight">Tech & AI Summits</h4>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Spotlight Section */}
      {featuredEvent && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-purple-50 text-[#6D28D9] flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-[#172033] tracking-tight">
                  Featured Headline Event
                </h2>
                <p className="text-xs text-[#64748B]">South India's most anticipated tech gathering</p>
              </div>
            </div>
            <button
              onClick={() => onExplore()}
              className="text-xs font-bold text-[#6D28D9] hover:text-[#5b21b6] flex items-center gap-1 cursor-pointer"
            >
              <span>Explore All Events</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div
            onClick={() => onSelectEvent(featuredEvent)}
            className="group relative bg-white border border-[#E5E7EB] hover:border-purple-300 rounded-3xl overflow-hidden shadow-xs hover:shadow-lg transition-all duration-300 grid grid-cols-1 lg:grid-cols-12 cursor-pointer"
          >
            {/* Poster Image */}
            <div className="lg:col-span-7 relative h-72 sm:h-96 overflow-hidden bg-slate-100">
              <img
                src={featuredEvent.posterUrl}
                alt={featuredEvent.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-md text-[#6D28D9] border border-[#E5E7EB] text-xs font-bold px-3 py-1 rounded-full shadow-xs">
                {featuredEvent.category}
              </div>
              <div className="absolute top-4 right-4 bg-emerald-50 border border-emerald-200 text-[#15803D] text-xs font-bold px-3 py-1 rounded-full backdrop-blur-md flex items-center gap-1.5 shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-[#15803D] animate-pulse"></span>
                Fast Filling
              </div>
            </div>

            {/* Event Description & Booking Meta */}
            <div className="lg:col-span-5 p-6 sm:p-8 flex flex-col justify-between bg-white">
              <div className="space-y-4">
                <div className="flex items-center space-x-3 text-xs text-[#64748B] font-medium">
                  <span className="flex items-center gap-1.5 text-[#6D28D9] font-bold">
                    <Calendar className="w-4 h-4" />
                    {formatIndianDate(featuredEvent.startAt)}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1 truncate text-[#64748B]">
                    <MapPin className="w-4 h-4 text-[#EA580C]" />
                    {featuredEvent.venue.name}, {featuredEvent.venue.city}
                  </span>
                </div>

                <h3 className="text-2xl sm:text-3xl font-black text-[#172033] group-hover:text-[#6D28D9] transition-colors leading-tight">
                  {featuredEvent.title}
                </h3>

                <p className="text-xs sm:text-sm text-[#64748B] leading-relaxed line-clamp-3">
                  {featuredEvent.description}
                </p>

                <div className="bg-[#FFFDF8] border border-[#E5E7EB] rounded-2xl p-4 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[#64748B] block text-[11px] font-semibold">Curated by</span>
                    <span className="font-bold text-[#172033]">{featuredEvent.organizer.organizationName}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[#64748B] block text-[11px] font-semibold">Venue Capacity</span>
                    <span className="font-bold text-[#172033]">
                      {(featuredEvent.venue?.capacity || featuredEvent.totalTickets || 6500).toLocaleString('en-IN')} Attendees
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-4 border-t border-[#E5E7EB] flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#64748B] tracking-wider block">
                    Passes Starting At
                  </span>
                  <span className="text-2xl font-black text-[#172033]">
                    {formatINR(featuredEvent.startingPrice || 129900)}
                  </span>
                </div>

                <button className="bg-[#6D28D9] group-hover:bg-[#5b21b6] text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-xs transition-all flex items-center space-x-2">
                  <span>Book Passes</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Trending Live Experiences Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-[#EA580C] flex items-center justify-center">
              <Flame className="w-4 h-4 text-[#EA580C]" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-[#172033] tracking-tight">
                Trending Events in India
              </h2>
              <p className="text-xs text-[#64748B]">
                Concerts, hackathons, and cultural galas filling fast with 10-minute hold protection
              </p>
            </div>
          </div>

          <button
            onClick={() => onExplore()}
            className="text-xs font-bold text-[#6D28D9] hover:text-[#5b21b6] flex items-center gap-1 cursor-pointer"
          >
            <span>See All ({events.length})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {trendingEvents.map((evt) => (
            <EventCard key={evt.id} event={evt} onSelect={onSelectEvent} />
          ))}
        </div>
      </section>

      {/* Concurrency & Zero Overselling Architecture Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-[#FFFDF8] border border-[#E5E7EB] rounded-3xl p-8 sm:p-12 relative overflow-hidden">
          <div className="max-w-3xl mb-8 relative z-10">
            <div className="inline-flex items-center space-x-2 bg-white border border-[#E5E7EB] px-3.5 py-1 rounded-full text-xs text-[#15803D] font-bold mb-3 shadow-2xs">
              <ShieldCheck className="w-3.5 h-3.5 text-[#15803D]" />
              <span>Zero-Overselling Architecture</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-[#172033] tracking-tight">
              Engineered for Instant, Fair & Reliable Event Ticketing in India.
            </h2>
            <p className="text-xs sm:text-sm text-[#64748B] mt-2 leading-relaxed">
              When high-demand tickets drop, thousands of attendees compete at the exact same millisecond. Eventora’s transactional reservation engine ensures fair access with atomic database locks and instant UPI payments.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
            <div className="bg-white border border-[#E5E7EB] p-6 rounded-2xl shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-[#6D28D9] flex items-center justify-center mb-4">
                <Clock className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-[#172033] mb-1">10-Minute Guaranteed Hold</h3>
              <p className="text-xs text-[#64748B] leading-relaxed">
                Your selected tickets are locked in the database exclusively for your checkout session. No checkout sniping or stolen seats while authorizing your UPI payment.
              </p>
            </div>

            <div className="bg-white border border-[#E5E7EB] p-6 rounded-2xl shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#15803D] flex items-center justify-center mb-4">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-[#172033] mb-1">Zero Overselling Guarantee</h3>
              <p className="text-xs text-[#64748B] leading-relaxed">
                Atomic database row locks and strict integer constraints guarantee that tickets sold can never exceed exact physical venue capacity.
              </p>
            </div>

            <div className="bg-white border border-[#E5E7EB] p-6 rounded-2xl shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-[#EA580C] flex items-center justify-center mb-4">
                <Lock className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-[#172033] mb-1">Cryptographic QR Passes</h3>
              <p className="text-xs text-[#64748B] leading-relaxed">
                Every ticket is sealed with an HMAC SHA-256 signature. Door scanners verify authenticity instantaneously even with low stadium connectivity.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Remaining Events Section */}
      {remainingEvents.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-[#172033] tracking-tight">
                All Live Indian Experiences
              </h2>
              <p className="text-xs text-[#64748B]">Explore college fests, concerts, and conclaves</p>
            </div>
            <button
              onClick={() => onExplore()}
              className="text-xs font-bold text-[#6D28D9] hover:text-[#5b21b6] flex items-center gap-1 cursor-pointer"
            >
              <span>Explore All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {remainingEvents.map((evt) => (
              <EventCard key={evt.id} event={evt} onSelect={onSelectEvent} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
