/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { User, EventItem, ReservationHold, Ticket, Role } from './types.ts';
import { api } from './api.ts';
import { Navbar } from './components/Navbar.tsx';
import { Footer } from './components/Footer.tsx';
import { TicketModal } from './components/TicketModal.tsx';
import { HomeView } from './views/HomeView.tsx';
import { ExploreView } from './views/ExploreView.tsx';
import { EventDetailsView } from './views/EventDetailsView.tsx';
import { CheckoutView } from './views/CheckoutView.tsx';
import { ConfirmationView } from './views/ConfirmationView.tsx';
import { AttendeeTicketsView } from './views/AttendeeTicketsView.tsx';
import { OrganizerDashboardView } from './views/OrganizerDashboardView.tsx';
import { AdminDashboardView } from './views/AdminDashboardView.tsx';
import { TicketVerifierView } from './views/TicketVerifierView.tsx';
import { AuthModal } from './views/AuthModal.tsx';
import { PolicyModal } from './views/PolicyPages.tsx';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [currentView, setCurrentView] = useState<string>('home');
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);

  // Active 10-minute hold session state
  const [activeHold, setActiveHold] = useState<ReservationHold | null>(null);
  const [activeHoldSeconds, setActiveHoldSeconds] = useState<number | null>(null);

  // Confirmed order state
  const [confirmedOrderResult, setConfirmedOrderResult] = useState<any | null>(null);

  // Modals state
  const [viewTicketModal, setViewTicketModal] = useState<Ticket | null>(null);
  const [authModalState, setAuthModalState] = useState<{ open: boolean; mode?: 'login' | 'register' }>({ open: false });
  const [policyType, setPolicyType] = useState<'privacy' | 'terms' | null>(null);

  // Explore filters state
  const [selectedCity, setSelectedCity] = useState<string>('Chennai');
  const [exploreParams, setExploreParams] = useState<{ q?: string; category?: string; city?: string }>({ city: 'Chennai' });

  // 1. Initial boot: Load events and check existing user session
  useEffect(() => {
    initApp();
  }, []);

  const initApp = async () => {
    setLoadingEvents(true);
    try {
      // Check auth session
      if (api.getToken()) {
        try {
          const me = await api.getMe();
          setUser(me);
        } catch {
          // Token expired, log in as default test attendee
          await loginDefaultAttendee();
        }
      } else {
        await loginDefaultAttendee();
      }

      // Fetch public events
      const eventsData = await api.getEvents();
      setEvents(eventsData);
    } catch (err) {
      console.error('Initial boot error:', err);
    } finally {
      setLoadingEvents(false);
    }
  };

  const loginDefaultAttendee = async () => {
    try {
      const res = await api.login('praveendevaraj2006@gmail.com', 'AttendeePass123!');
      setUser(res.user);
    } catch (err) {
      console.warn('Could not auto-login default attendee', err);
    }
  };

  // 2. Active hold countdown tracker
  useEffect(() => {
    if (!activeHold) {
      setActiveHoldSeconds(null);
      return;
    }

    const updateTimer = () => {
      const diff = Math.floor((new Date(activeHold.expiresAt).getTime() - Date.now()) / 1000);
      if (diff <= 0) {
        setActiveHold(null);
        setActiveHoldSeconds(null);
        if (currentView === 'checkout') {
          alert('Your 10-minute ticket hold has expired. The tickets have been released back to other attendees.');
          setCurrentView('home');
        }
      } else {
        setActiveHoldSeconds(diff);
      }
    };

    updateTimer();
    const timer = setInterval(updateTimer, 1000);
    return () => clearInterval(timer);
  }, [activeHold, currentView]);

  // Persona quick-login handler
  const handleLoginPersona = async (role: Role) => {
    let email = 'praveendevaraj2006@gmail.com';
    let pass = 'AttendeePass123!';

    if (role === 'ORGANIZER') {
      email = 'apex@events.in';
      pass = 'OrganizerPass123!';
    } else if (role === 'ADMIN') {
      email = 'admin@eventora.in';
      pass = 'AdminPass123!';
    }

    try {
      const res = await api.login(email, pass);
      setUser(res.user);
      if (role === 'ORGANIZER') {
        setCurrentView('organizer');
      } else if (role === 'ADMIN') {
        setCurrentView('admin');
      } else {
        setCurrentView('explore');
      }
    } catch (err) {
      console.error('Persona login error:', err);
    }
  };

  const handleLogout = async () => {
    await api.logout();
    setUser(null);
    setCurrentView('home');
  };

  // Navigation router
  const handleNavigate = (view: string, data?: any) => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (view === 'event-details' && data) {
      setSelectedEvent(data);
    }
    setCurrentView(view);
  };

  const handleSelectEvent = async (event: EventItem) => {
    try {
      const detailed = await api.getEventById(event.id);
      setSelectedEvent(detailed);
      setCurrentView('event-details');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setSelectedEvent(event);
      setCurrentView('event-details');
    }
  };

  const handleReservationCreated = (hold: ReservationHold) => {
    setActiveHold(hold);
    setCurrentView('checkout');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePaymentCompleted = (orderResult: any) => {
    setActiveHold(null);
    setConfirmedOrderResult(orderResult);
    setCurrentView('confirmation');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleReleaseHold = async () => {
    if (activeHold) {
      try {
        await api.releaseReservation(activeHold.reservationId);
      } catch {}
      setActiveHold(null);
      setCurrentView('home');
    }
  };

  return (
    <div className="min-h-screen bg-white text-[#111827] flex flex-col font-sans selection:bg-[#6D28D9] selection:text-white antialiased">
      {/* Top White Navbar */}
      <Navbar
        user={user}
        activeHoldSeconds={activeHoldSeconds}
        selectedCity={selectedCity}
        onSelectCity={(city) => {
          setSelectedCity(city);
          setExploreParams((p) => ({ ...p, city }));
        }}
        onNavigate={handleNavigate}
        onLoginPersona={handleLoginPersona}
        onOpenAuth={(mode) => setAuthModalState({ open: true, mode })}
        onLogout={handleLogout}
        currentView={currentView}
      />

      {/* Main View Router */}
      <main className="flex-1 bg-white">
        {currentView === 'home' && (
          <HomeView
            events={events}
            onSelectEvent={handleSelectEvent}
            onExplore={(params) => {
              if (params) setExploreParams(params);
              setCurrentView('explore');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}

        {currentView === 'explore' && (
          <ExploreView
            events={events}
            initialQuery={exploreParams.q}
            initialCategory={exploreParams.category}
            initialCity={exploreParams.city}
            onSelectEvent={handleSelectEvent}
          />
        )}

        {currentView === 'event-details' && selectedEvent && (
          <EventDetailsView
            event={selectedEvent}
            onBack={() => setCurrentView('explore')}
            onReservationCreated={handleReservationCreated}
            onOpenAuth={() => setAuthModalState({ open: true, mode: 'login' })}
            isAuthenticated={!!user}
          />
        )}

        {currentView === 'checkout' && activeHold && user && (
          <CheckoutView
            hold={activeHold}
            user={user}
            onPaymentCompleted={handlePaymentCompleted}
            onHoldExpired={() => {
              setActiveHold(null);
              setCurrentView('home');
            }}
            onReleaseHold={handleReleaseHold}
          />
        )}

        {currentView === 'confirmation' && confirmedOrderResult && (
          <ConfirmationView
            orderResult={confirmedOrderResult}
            onViewTicket={(ticket) => setViewTicketModal(ticket)}
            onNavigateTickets={() => setCurrentView('tickets')}
            onExploreMore={() => setCurrentView('explore')}
          />
        )}

        {currentView === 'tickets' && (
          <AttendeeTicketsView
            onViewTicket={(ticket) => setViewTicketModal(ticket)}
            onExplore={() => setCurrentView('explore')}
          />
        )}

        {currentView === 'organizer' && user && (
          <OrganizerDashboardView
            user={user}
            onExplore={() => setCurrentView('explore')}
          />
        )}

        {currentView === 'admin' && user && (
          <AdminDashboardView user={user} />
        )}

        {currentView === 'verifier' && (
          <TicketVerifierView />
        )}
      </main>

      {/* Clean White/Light Footer */}
      <Footer onOpenPolicy={(type) => setPolicyType(type)} />

      {/* Printable / Downloadable Ticket Modal */}
      <TicketModal
        ticket={viewTicketModal}
        onClose={() => setViewTicketModal(null)}
      />

      {/* Authentication Modal */}
      {authModalState.open && (
        <AuthModal
          initialMode={authModalState.mode}
          onClose={() => setAuthModalState({ open: false })}
          onSuccess={(loggedInUser) => {
            setUser(loggedInUser);
            if (loggedInUser.role === 'ORGANIZER') {
              setCurrentView('organizer');
            } else if (loggedInUser.role === 'ADMIN') {
              setCurrentView('admin');
            }
          }}
        />
      )}

      {/* Policy Modal */}
      <PolicyModal
        type={policyType}
        onClose={() => setPolicyType(null)}
      />
    </div>
  );
}
