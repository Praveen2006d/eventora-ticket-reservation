/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { EventItem } from '../types.ts';
import { Calendar, MapPin, ArrowRight } from 'lucide-react';
import { formatINR, formatIndianDate } from '../utils/formatters.ts';

interface EventCardProps {
  event: EventItem;
  onSelect: (event: EventItem) => void;
}

export const EventCard: React.FC<EventCardProps> = ({ event, onSelect }) => {
  const [imageError, setImageError] = useState(false);

  const fallbackImage =
    'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800&q=80';

  const formattedDate = formatIndianDate(event.startAt);

  const formattedPrice = event.startingPrice
    ? formatINR(event.startingPrice)
    : 'Free';

  const isSoldOut = (event.totalAvailableTickets ?? 1) <= 0;

  return (
    <div
      onClick={() => onSelect(event)}
      className="group bg-white border border-[#E5E7EB] hover:border-purple-300 rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all duration-300 flex flex-col cursor-pointer transform hover:-translate-y-1"
    >
      {/* Poster Image Container */}
      <div className="relative h-48 w-full overflow-hidden bg-slate-100">
        <img
          src={imageError ? fallbackImage : event.posterUrl || fallbackImage}
          alt={event.title}
          onError={() => setImageError(true)}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-60" />

        {/* Category Badge */}
        <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-md border border-[#E5E7EB] text-[#6D28D9] text-[11px] font-bold px-2.5 py-1 rounded-full shadow-xs">
          {event.category}
        </div>

        {/* Availability Badge */}
        <div className="absolute top-3 right-3">
          {isSoldOut ? (
            <span className="bg-[#DC2626] text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shadow-xs">
              Sold Out
            </span>
          ) : (
            <span className="bg-emerald-50 border border-emerald-200 text-[#15803D] text-[10px] font-bold px-2.5 py-0.5 rounded-full backdrop-blur-md flex items-center gap-1.5 shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-[#15803D] animate-pulse"></span>
              Fast Filling
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-5 flex-1 flex flex-col justify-between bg-white">
        <div>
          {/* Date & Location */}
          <div className="flex items-center space-x-2 text-xs text-[#64748B] mb-2 font-medium">
            <span className="flex items-center gap-1 text-[#6D28D9] font-semibold">
              <Calendar className="w-3.5 h-3.5" />
              {formattedDate}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1 truncate text-[#64748B]">
              <MapPin className="w-3.5 h-3.5 text-[#94A3B8]" />
              {event.venue.city}, {event.venue.state}
            </span>
          </div>

          {/* Title */}
          <h3 className="text-base font-bold text-[#111827] group-hover:text-[#6D28D9] transition-colors line-clamp-2 leading-snug">
            {event.title}
          </h3>

          <p className="text-xs text-[#64748B] mt-1.5 line-clamp-2 leading-relaxed">
            {event.description}
          </p>
        </div>

        {/* Footer Info & Pricing */}
        <div className="mt-5 pt-3.5 border-t border-[#E5E7EB] flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase text-[#64748B] tracking-wider font-semibold block">
              Starts at
            </span>
            <span className="text-lg font-extrabold text-[#111827]">
              {formattedPrice}
            </span>
          </div>

          <div className="flex items-center space-x-1.5 text-xs font-bold text-[#6D28D9] group-hover:text-[#5b21b6] transition-colors bg-purple-50 group-hover:bg-purple-100 px-3 py-1.5 rounded-lg">
            <span>Book Now</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
      </div>
    </div>
  );
};
