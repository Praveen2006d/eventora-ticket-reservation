/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { EventItem } from '../types.ts';
import { EventCard } from '../components/EventCard.tsx';
import { Search, MapPin, Filter, SlidersHorizontal, Calendar, X, Sparkles } from 'lucide-react';

interface ExploreViewProps {
  events: EventItem[];
  initialCategory?: string;
  initialQuery?: string;
  initialCity?: string;
  onSelectEvent: (event: EventItem) => void;
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

export const ExploreView: React.FC<ExploreViewProps> = ({
  events,
  initialCategory,
  initialQuery,
  initialCity,
  onSelectEvent,
}) => {
  const [search, setSearch] = useState(initialQuery || '');
  const [category, setCategory] = useState(initialCategory || 'All');
  const [city, setCity] = useState(initialCity || 'All');
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [sortBy, setSortBy] = useState<'date' | 'price_asc' | 'price_desc'>('date');

  // Derive unique cities from events merged with Indian popular hubs
  const uniqueCities = useMemo(() => {
    const defaultCities = ['Chennai', 'Bengaluru', 'Coimbatore', 'Hyderabad', 'Mumbai', 'New Delhi'];
    const eventCities = events.map((e) => e.venue?.city).filter(Boolean);
    const combined = Array.from(new Set([...defaultCities, ...eventCities]));
    return ['All', ...combined];
  }, [events]);

  // Filtered & sorted events
  const filteredEvents = useMemo(() => {
    return events
      .filter((evt) => {
        // Search text
        if (search.trim()) {
          const q = search.toLowerCase();
          const matchTitle = evt.title.toLowerCase().includes(q);
          const matchDesc = evt.description.toLowerCase().includes(q);
          const matchCity = evt.venue.city.toLowerCase().includes(q);
          if (!matchTitle && !matchDesc && !matchCity) return false;
        }

        // Category
        if (category !== 'All' && evt.category !== category) {
          return false;
        }

        // City
        if (city !== 'All' && evt.venue.city !== city) {
          return false;
        }

        // Availability
        if (onlyAvailable && (evt.totalAvailableTickets ?? 0) <= 0) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'price_asc') {
          return (a.startingPrice || 0) - (b.startingPrice || 0);
        }
        if (sortBy === 'price_desc') {
          return (b.startingPrice || 0) - (a.startingPrice || 0);
        }
        return new Date(a.startAt).getTime() - new Date(b.startAt).getTime();
      });
  }, [events, search, category, city, onlyAvailable, sortBy]);

  const resetFilters = () => {
    setSearch('');
    setCategory('All');
    setCity('All');
    setOnlyAvailable(false);
    setSortBy('date');
  };

  const hasActiveFilters = search || category !== 'All' || city !== 'All' || onlyAvailable;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 bg-white">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-[#111827] tracking-tight">
          Explore Live Events
        </h1>
        <p className="text-xs text-[#64748B] mt-1">
          Discover conferences, concerts, and gatherings with real-time ticket availability.
        </p>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4 shadow-xs space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Keyword Search */}
          <div className="md:col-span-5 flex items-center px-3.5 bg-[#F8FAFC] rounded-xl border border-[#E5E7EB] focus-within:border-[#6D28D9] focus-within:bg-white transition-all">
            <Search className="w-4 h-4 text-[#94A3B8] mr-2 shrink-0" />
            <input
              type="text"
              placeholder="Search by event, artist, or keyword..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full py-2.5 text-xs text-[#111827] placeholder-[#94A3B8] bg-transparent focus:outline-none font-medium"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="text-[#94A3B8] hover:text-[#111827] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* City Filter */}
          <div className="md:col-span-3 flex items-center px-3 bg-[#F8FAFC] rounded-xl border border-[#E5E7EB] focus-within:border-[#6D28D9] focus-within:bg-white transition-all">
            <MapPin className="w-4 h-4 text-[#94A3B8] mr-2 shrink-0" />
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full py-2.5 text-xs text-[#111827] bg-transparent focus:outline-none cursor-pointer font-medium"
            >
              {uniqueCities.map((c) => (
                <option key={c} value={c}>
                  {c === 'All' ? 'All Locations' : c}
                </option>
              ))}
            </select>
          </div>

          {/* Sort By */}
          <div className="md:col-span-4 flex items-center px-3 bg-[#F8FAFC] rounded-xl border border-[#E5E7EB] focus-within:border-[#6D28D9] focus-within:bg-white transition-all">
            <SlidersHorizontal className="w-4 h-4 text-[#94A3B8] mr-2 shrink-0" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full py-2.5 text-xs text-[#111827] bg-transparent focus:outline-none cursor-pointer font-medium"
            >
              <option value="date">Sort by Date (Soonest first)</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
            </select>
          </div>
        </div>

        {/* Category Pills & Availability Checkbox */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#E5E7EB]">
          <div className="flex flex-wrap items-center gap-1.5">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                  category === cat
                    ? 'bg-[#6D28D9] text-white shadow-2xs'
                    : 'bg-white hover:bg-slate-50 text-[#4B5563] hover:text-[#111827] border border-[#E5E7EB]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="flex items-center space-x-4">
            <label className="flex items-center space-x-2 text-xs text-[#4B5563] cursor-pointer select-none">
              <input
                type="checkbox"
                checked={onlyAvailable}
                onChange={(e) => setOnlyAvailable(e.target.checked)}
                className="rounded border-[#E5E7EB] text-[#6D28D9] focus:ring-[#6D28D9] cursor-pointer"
              />
              <span>Available Tickets Only</span>
            </label>

            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="text-xs font-bold text-[#DC2626] hover:underline cursor-pointer"
              >
                Reset Filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Events Results Count */}
      <div className="flex items-center justify-between text-xs text-[#64748B] font-medium">
        <span>
          Showing <strong className="text-[#111827]">{filteredEvents.length}</strong> of{' '}
          <strong className="text-[#111827]">{events.length}</strong> events
        </span>
        {city !== 'All' && <span>Location: {city}</span>}
      </div>

      {/* Events Grid */}
      {filteredEvents.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEvents.map((evt) => (
            <EventCard key={evt.id} event={evt} onSelect={onSelectEvent} />
          ))}
        </div>
      ) : (
        <div className="bg-[#F8FAFC] border border-[#E5E7EB] rounded-3xl p-12 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-[#6D28D9] flex items-center justify-center mx-auto">
            <Search className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-[#111827]">No events found</h3>
          <p className="text-xs text-[#64748B] max-w-sm mx-auto">
            We couldn’t find any events matching your selected filters. Try broadening your keywords or selecting All Locations.
          </p>
          <button
            onClick={resetFilters}
            className="bg-[#6D28D9] hover:bg-[#5b21b6] text-white text-xs font-bold px-4 py-2 rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            Clear All Filters
          </button>
        </div>
      )}
    </div>
  );
};
