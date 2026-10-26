/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';

// Setup database storage path
const dataDir = path.resolve(process.cwd(), '.data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbFilePath = process.env.NODE_ENV === 'test' ? ':memory:' : path.join(dataDir, 'eventora.db');
export const db = new DatabaseSync(dbFilePath);

// Enable WAL mode and foreign keys for high-performance concurrent transactions
db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;
  PRAGMA busy_timeout = 5000;
`);

export function initializeDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'ATTENDEE',
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS organizer_profiles (
      id TEXT PRIMARY KEY,
      user_id TEXT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      organization_name TEXT NOT NULL,
      description TEXT,
      verification_status TEXT NOT NULL DEFAULT 'PENDING',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS venues (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      address TEXT NOT NULL,
      city TEXT NOT NULL,
      state TEXT NOT NULL,
      country TEXT NOT NULL DEFAULT 'India',
      capacity INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      organizer_id TEXT NOT NULL REFERENCES organizer_profiles(id) ON DELETE RESTRICT,
      venue_id TEXT NOT NULL REFERENCES venues(id) ON DELETE RESTRICT,
      title TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      poster_url TEXT NOT NULL,
      start_at TEXT NOT NULL,
      end_at TEXT NOT NULL,
      sales_start_at TEXT NOT NULL,
      sales_cutoff_at TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'DRAFT',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ticket_tiers (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT,
      price INTEGER NOT NULL, -- in minor units (paise)
      currency TEXT NOT NULL DEFAULT 'INR',
      total_quantity INTEGER NOT NULL CHECK (total_quantity > 0),
      available_quantity INTEGER NOT NULL CHECK (available_quantity >= 0),
      reserved_quantity INTEGER NOT NULL DEFAULT 0 CHECK (reserved_quantity >= 0),
      sold_quantity INTEGER NOT NULL DEFAULT 0 CHECK (sold_quantity >= 0),
      sales_start_at TEXT,
      sales_end_at TEXT,
      max_per_order INTEGER NOT NULL DEFAULT 6,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      CHECK (available_quantity + reserved_quantity + sold_quantity = total_quantity)
    );

    CREATE TABLE IF NOT EXISTS reservations (
      id TEXT PRIMARY KEY,
      attendee_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'HELD',
      idempotency_key TEXT UNIQUE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS reservation_items (
      id TEXT PRIMARY KEY,
      reservation_id TEXT NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
      ticket_tier_id TEXT NOT NULL REFERENCES ticket_tiers(id) ON DELETE RESTRICT,
      quantity INTEGER NOT NULL CHECK (quantity > 0),
      unit_price INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      attendee_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      reservation_id TEXT REFERENCES reservations(id) ON DELETE SET NULL,
      order_number TEXT UNIQUE NOT NULL,
      subtotal INTEGER NOT NULL,
      fees INTEGER NOT NULL,
      total_amount INTEGER NOT NULL,
      currency TEXT NOT NULL DEFAULT 'INR',
      status TEXT NOT NULL DEFAULT 'PENDING',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      ticket_tier_id TEXT NOT NULL REFERENCES ticket_tiers(id) ON DELETE RESTRICT,
      quantity INTEGER NOT NULL CHECK (quantity > 0),
      unit_price INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS payment_transactions (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      provider TEXT NOT NULL DEFAULT 'EVENTORA_MOCK_GATEWAY',
      provider_reference TEXT UNIQUE,
      amount INTEGER NOT NULL,
      currency TEXT NOT NULL DEFAULT 'INR',
      status TEXT NOT NULL DEFAULT 'PENDING',
      idempotency_key TEXT UNIQUE NOT NULL,
      failure_reason TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tickets (
      id TEXT PRIMARY KEY,
      order_item_id TEXT NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
      attendee_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      event_id TEXT NOT NULL REFERENCES events(id) ON DELETE RESTRICT,
      ticket_code TEXT UNIQUE NOT NULL,
      qr_code_data TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'VALID',
      issued_at TEXT NOT NULL,
      checked_in_at TEXT
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      actor_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      metadata TEXT,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_events_status_start ON events(status, start_at);
    CREATE INDEX IF NOT EXISTS idx_events_category ON events(category);
    CREATE INDEX IF NOT EXISTS idx_events_organizer ON events(organizer_id);
    CREATE INDEX IF NOT EXISTS idx_ticket_tiers_event ON ticket_tiers(event_id);
    CREATE INDEX IF NOT EXISTS idx_reservations_status_expires ON reservations(status, expires_at);
    CREATE INDEX IF NOT EXISTS idx_reservations_attendee ON reservations(attendee_id);
    CREATE INDEX IF NOT EXISTS idx_orders_attendee ON orders(attendee_id);
    CREATE INDEX IF NOT EXISTS idx_tickets_attendee ON tickets(attendee_id);
    CREATE INDEX IF NOT EXISTS idx_tickets_code ON tickets(ticket_code);
  `);

  seedDefaultData();
}

/**
 * Hash password with PBKDF2
 */
export function hashPassword(password: string): string {
  const salt = 'eventora_secure_static_salt_for_dev_mode';
  return crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
}

export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

/**
 * Seed realistic development data with distinctly Indian event ecosystem
 */
function seedDefaultData() {
  const countRow = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  if (countRow && countRow.count > 0) {
    return; // Already seeded
  }

  console.log('[Database] Seeding initial Eventora data with Indian ecosystem (Praveen as primary demo user)...');
  const now = new Date().toISOString();

  // 1. Users - Praveen as Primary Demo User
  const users = [
    {
      id: 'usr-admin-01',
      name: 'Dr. Rajeshwari Iyer (Admin)',
      email: 'admin@eventora.in',
      passwordHash: hashPassword('AdminPass123!'),
      role: 'ADMIN',
      status: 'ACTIVE',
    },
    {
      id: 'usr-org-01',
      name: 'Vikramaditya Singhania (Apex)',
      email: 'apex@events.in',
      passwordHash: hashPassword('OrganizerPass123!'),
      role: 'ORGANIZER',
      status: 'ACTIVE',
    },
    {
      id: 'usr-org-02',
      name: 'Ananya Krishnan (Southwind)',
      email: 'southwind@festivals.in',
      passwordHash: hashPassword('OrganizerPass123!'),
      role: 'ORGANIZER',
      status: 'ACTIVE',
    },
    {
      id: 'usr-att-01',
      name: 'Praveen Devaraj',
      email: 'praveendevaraj2006@gmail.com',
      passwordHash: hashPassword('AttendeePass123!'),
      role: 'ATTENDEE',
      status: 'ACTIVE',
    },
    {
      id: 'usr-att-02',
      name: 'Karthik Subramanian',
      email: 'karthik.s@example.com',
      passwordHash: hashPassword('AttendeePass123!'),
      role: 'ATTENDEE',
      status: 'ACTIVE',
    },
  ];

  const insertUser = db.prepare(`
    INSERT INTO users (id, name, email, password_hash, role, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const u of users) {
    insertUser.run(u.id, u.name, u.email, u.passwordHash, u.role, u.status, now, now);
  }

  // 2. Organizer Profiles
  const insertOrg = db.prepare(`
    INSERT INTO organizer_profiles (id, user_id, organization_name, description, verification_status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  insertOrg.run(
    'org-apex-01',
    'usr-org-01',
    'Apex Live Productions India',
    'Organizers of national technology summits, developer conclaves, and premier Indian hackathons.',
    'VERIFIED',
    now,
    now
  );
  insertOrg.run(
    'org-soundwave-02',
    'usr-org-02',
    'Southwind Cultural & Music Experiences',
    'Curators of South Indian classical & fusion live music festivals, collegiate cultural events, and art galas.',
    'VERIFIED',
    now,
    now
  );

  // 3. Indian Venues (Chennai Default and other popular hubs)
  const insertVenue = db.prepare(`
    INSERT INTO venues (id, name, address, city, state, country, capacity, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const venues = [
    {
      id: 'ven-sf-civic', // Retain ID for compatibility with existing tests
      name: 'Chennai Trade Centre',
      address: 'Mount Poonamallee Road, Nandambakkam',
      city: 'Chennai',
      state: 'Tamil Nadu',
      country: 'India',
      capacity: 6500,
    },
    {
      id: 'ven-nyc-pier',
      name: 'Anna University Convention Auditorium',
      address: 'Sardar Patel Road, Guindy',
      city: 'Chennai',
      state: 'Tamil Nadu',
      country: 'India',
      capacity: 3500,
    },
    {
      id: 'ven-austin-amph',
      name: 'Madras Music Academy & Open Grounds',
      address: 'TT Krishnamachari Road, Royapettah',
      city: 'Chennai',
      state: 'Tamil Nadu',
      country: 'India',
      capacity: 8000,
    },
    {
      id: 'ven-london-dock',
      name: 'Bengaluru Palace Grounds',
      address: 'Jayamahal Road, Vasanth Nagar',
      city: 'Bengaluru',
      state: 'Karnataka',
      country: 'India',
      capacity: 15000,
    },
    {
      id: 'ven-coimbatore-codissia',
      name: 'CODISSIA Trade Fair Complex',
      address: 'G.V. Fair Grounds, Avinashi Road',
      city: 'Coimbatore',
      state: 'Tamil Nadu',
      country: 'India',
      capacity: 5000,
    },
    {
      id: 'ven-hyderabad-hitex',
      name: 'HITEX Exhibition Center',
      address: 'Trade Fair Office Building, Madhapur',
      city: 'Hyderabad',
      state: 'Telangana',
      country: 'India',
      capacity: 8500,
    },
    {
      id: 'ven-mumbai-jio',
      name: 'Jio World Convention Centre',
      address: 'G Block, Bandra Kurla Complex',
      city: 'Mumbai',
      state: 'Maharashtra',
      country: 'India',
      capacity: 12000,
    },
  ];
  for (const v of venues) {
    insertVenue.run(v.id, v.name, v.address, v.city, v.state, v.country, v.capacity, now, now);
  }

  // 4. Events - Realistic Indian Sample Data
  const insertEvent = db.prepare(`
    INSERT INTO events (id, organizer_id, venue_id, title, slug, description, category, poster_url, start_at, end_at, sales_start_at, sales_cutoff_at, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const events = [
    {
      id: 'evt-ai-summit-2026',
      organizerId: 'org-apex-01',
      venueId: 'ven-sf-civic', // Chennai Trade Centre
      title: 'Chennai Tech Summit & AI Innovation Conclave 2026',
      slug: 'chennai-tech-ai-summit-2026',
      description: 'South India’s premier gathering of software architects, AI researchers, deep-tech startup founders, and engineering leaders exploring frontier LLMs, agentic systems, and cloud infrastructure.',
      category: 'Technology',
      posterUrl: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80',
      startAt: new Date(Date.now() + 14 * 86400000).toISOString(),
      endAt: new Date(Date.now() + 16 * 86400000).toISOString(),
      salesStartAt: new Date(Date.now() - 30 * 86400000).toISOString(),
      salesCutoffAt: new Date(Date.now() + 13 * 86400000).toISOString(),
      status: 'PUBLISHED',
    },
    {
      id: 'evt-college-fest-2026',
      organizerId: 'org-soundwave-02',
      venueId: 'ven-nyc-pier', // Anna University
      title: 'Dakshin Revels: Tamil Nadu Inter-College Cultural Fest 2026',
      slug: 'dakshin-revels-college-fest-2026',
      description: 'The most electrifying student cultural festival in South India featuring 45+ universities, dance choreography championships, battle of the college bands, and a star celebrity pro-night.',
      category: 'College Festivals',
      posterUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1200&q=80',
      startAt: new Date(Date.now() + 18 * 86400000).toISOString(),
      endAt: new Date(Date.now() + 20 * 86400000).toISOString(),
      salesStartAt: new Date(Date.now() - 15 * 86400000).toISOString(),
      salesCutoffAt: new Date(Date.now() + 17 * 86400000).toISOString(),
      status: 'PUBLISHED',
    },
    {
      id: 'evt-synth-wave-fest',
      organizerId: 'org-soundwave-02',
      venueId: 'ven-austin-amph', // Madras Music Academy
      title: 'Chennai Margazhi Live & Contemporary Fusion Music Festival',
      slug: 'chennai-live-music-festival',
      description: 'An unforgettable 3-night musical extravaganza celebrating classical ragas woven seamlessly with contemporary world fusion, percussion ensembles, and immersive visual laser staging.',
      category: 'Concerts',
      posterUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=1200&q=80',
      startAt: new Date(Date.now() + 21 * 86400000).toISOString(),
      endAt: new Date(Date.now() + 23 * 86400000).toISOString(),
      salesStartAt: new Date(Date.now() - 20 * 86400000).toISOString(),
      salesCutoffAt: new Date(Date.now() + 20 * 86400000).toISOString(),
      status: 'PUBLISHED',
    },
    {
      id: 'evt-hackathon-india',
      organizerId: 'org-apex-01',
      venueId: 'ven-london-dock', // Bengaluru Palace Grounds
      title: 'National Student Hackathon & AI Sprint 2026',
      slug: 'national-student-hackathon-2026',
      description: 'A 36-hour non-stop in-person hackathon bringing together over 1,200 student coders, designers, and AI creators across India to build transformative solutions for fintech, healthtech, and climate.',
      category: 'Hackathons',
      posterUrl: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1200&q=80',
      startAt: new Date(Date.now() + 10 * 86400000).toISOString(),
      endAt: new Date(Date.now() + 12 * 86400000).toISOString(),
      salesStartAt: new Date(Date.now() - 10 * 86400000).toISOString(),
      salesCutoffAt: new Date(Date.now() + 9 * 86400000).toISOString(),
      status: 'PUBLISHED',
    },
    {
      id: 'evt-fintech-disrupt',
      organizerId: 'org-apex-01',
      venueId: 'ven-hyderabad-hitex', // HITEX Hyderabad
      title: 'India Fintech & Startup Conclave 2026',
      slug: 'india-fintech-startup-conclave',
      description: 'Exploring the future of UPI 2.0, open banking protocols, account aggregators, and venture funding dynamics with India’s foremost startup unicorn founders and regulators.',
      category: 'Conferences',
      posterUrl: 'https://images.unsplash.com/photo-1591115765373-5207764f72e7?auto=format&fit=crop&w=1200&q=80',
      startAt: new Date(Date.now() + 28 * 86400000).toISOString(),
      endAt: new Date(Date.now() + 30 * 86400000).toISOString(),
      salesStartAt: new Date(Date.now() - 5 * 86400000).toISOString(),
      salesCutoffAt: new Date(Date.now() + 27 * 86400000).toISOString(),
      status: 'PUBLISHED',
    },
    {
      id: 'evt-cultural-celebration',
      organizerId: 'org-soundwave-02',
      venueId: 'ven-mumbai-jio', // Jio World Centre Mumbai
      title: 'Utsav: All-India Classical Dance & Performing Arts Gala',
      slug: 'utsav-classical-arts-gala',
      description: 'A magnificent heritage showcase of Bharatanatyam, Kathak, Odissi, and folk art forms performed by world-renowned maestros and celebrated cultural troupes.',
      category: 'Cultural Celebrations',
      posterUrl: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=1200&q=80',
      startAt: new Date(Date.now() + 35 * 86400000).toISOString(),
      endAt: new Date(Date.now() + 37 * 86400000).toISOString(),
      salesStartAt: new Date(Date.now() - 10 * 86400000).toISOString(),
      salesCutoffAt: new Date(Date.now() + 34 * 86400000).toISOString(),
      status: 'PUBLISHED',
    },
    {
      id: 'evt-apex-draft-01',
      organizerId: 'org-apex-01',
      venueId: 'ven-sf-civic',
      title: 'Quantum Computing Architecture Forum (Unannounced)',
      slug: 'quantum-computing-architecture-forum',
      description: 'Private closed-door round-table on cryogenic packaging and quantum algorithms.',
      category: 'Technology',
      posterUrl: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=1200&q=80',
      startAt: new Date(Date.now() + 60 * 86400000).toISOString(),
      endAt: new Date(Date.now() + 61 * 86400000).toISOString(),
      salesStartAt: new Date(Date.now() + 10 * 86400000).toISOString(),
      salesCutoffAt: new Date(Date.now() + 59 * 86400000).toISOString(),
      status: 'DRAFT', // Draft event - tenant isolated & omitted from public search
    },
  ];

  for (const e of events) {
    insertEvent.run(
      e.id,
      e.organizerId,
      e.venueId,
      e.title,
      e.slug,
      e.description,
      e.category,
      e.posterUrl,
      e.startAt,
      e.endAt,
      e.salesStartAt,
      e.salesCutoffAt,
      e.status,
      now,
      now
    );
  }

  // 5. Ticket Tiers in INR minor units (paise)
  const insertTier = db.prepare(`
    INSERT INTO ticket_tiers (id, event_id, name, description, price, currency, total_quantity, available_quantity, reserved_quantity, sold_quantity, max_per_order, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const tiers = [
    // 1. Chennai Tech Summit
    {
      id: 'tier-ai-vip',
      eventId: 'evt-ai-summit-2026',
      name: 'VIP All-Access + Speaker Dinner Pass',
      description: 'Front-row keynote seating, access to VIP lounge, and invitation to executive speaker dinner.',
      price: 799900, // ₹7,999
      total: 50,
      avail: 42,
      res: 3,
      sold: 5,
    },
    {
      id: 'tier-ai-general',
      eventId: 'evt-ai-summit-2026',
      name: 'Standard Conference Delegate Pass',
      description: 'Full 2-day access to all keynote sessions, breakout tracks, expo hall, and lunch networking.',
      price: 249900, // ₹2,499
      total: 300,
      avail: 240,
      res: 15,
      sold: 45,
    },
    {
      id: 'tier-ai-early',
      eventId: 'evt-ai-summit-2026',
      name: 'Student & Open-Source Builder Pass',
      description: 'Subsidized admission for college students, researchers, and open-source contributors.',
      price: 129900, // ₹1,299
      total: 100,
      avail: 10,
      res: 0,
      sold: 90,
    },
    // Dedicated tier with 10 inventory for automated concurrency verification (Test A)
    {
      id: 'tier-concurrency-test-10',
      eventId: 'evt-ai-summit-2026',
      name: 'Concurrency Benchmark Tier (Strict 10)',
      description: 'Special test tier with exactly 10 units of total inventory for concurrency stress validation.',
      price: 49900, // ₹499
      total: 10,
      avail: 10,
      res: 0,
      sold: 0,
    },

    // 2. College Festival
    {
      id: 'tier-fest-student',
      eventId: 'evt-college-fest-2026',
      name: 'All-Day College Fest Pass',
      description: 'Access to all cultural competitions, campus zones, food stalls, and daytime events.',
      price: 29900, // ₹299
      total: 800,
      avail: 620,
      res: 30,
      sold: 150,
    },
    {
      id: 'tier-fest-pro',
      eventId: 'evt-college-fest-2026',
      name: 'Celebrity Pro-Night Special Admission',
      description: 'Entry to evening celebrity musical concert, prime stage viewing, and DJ night.',
      price: 79900, // ₹799
      total: 400,
      avail: 210,
      res: 10,
      sold: 180,
    },
    {
      id: 'tier-fest-team',
      eventId: 'evt-college-fest-2026',
      name: 'Inter-College Contingent Pass (4 Members)',
      description: 'Group pass for competition participants representing visiting colleges.',
      price: 99900, // ₹999
      total: 100,
      avail: 75,
      res: 5,
      sold: 20,
    },

    // 3. Chennai Live Music Festival
    {
      id: 'tier-synth-ga',
      eventId: 'evt-synth-wave-fest',
      name: 'General Admission Weekend Pass',
      description: 'Admission to open-air lawn seating for all 3 days of live musical performances.',
      price: 99900, // ₹999
      total: 1000,
      avail: 720,
      res: 40,
      sold: 240,
    },
    {
      id: 'tier-synth-vip',
      eventId: 'evt-synth-wave-fest',
      name: 'Golden Circle Front-Row Experience',
      description: 'Reserved front section seating, express fast-track entrance, and food coupon.',
      price: 249900, // ₹2,499
      total: 150,
      avail: 95,
      res: 5,
      sold: 50,
    },
    {
      id: 'tier-synth-royal',
      eventId: 'evt-synth-wave-fest',
      name: 'Royal Balcony & Lounge Access',
      description: 'Elevated VIP balcony viewing with hospitality service and meet & greet opportunities.',
      price: 499900, // ₹4,999
      total: 50,
      avail: 32,
      res: 3,
      sold: 15,
    },

    // 4. National Student Hackathon
    {
      id: 'tier-hack-builder',
      eventId: 'evt-hackathon-india',
      name: 'Individual Hacker Pass (36-Hour Sprint)',
      description: 'Sprint entry, high-speed Wi-Fi, mentorship roundtables, meals, red-bull, and swags.',
      price: 39900, // ₹399
      total: 500,
      avail: 380,
      res: 20,
      sold: 100,
    },
    {
      id: 'tier-hack-team',
      eventId: 'evt-hackathon-india',
      name: 'Team Admission Bundle (Up to 4 Hackers)',
      description: 'Guaranteed shared team booth and fast-track submission evaluation.',
      price: 119900, // ₹1,199
      total: 120,
      avail: 85,
      res: 5,
      sold: 30,
    },

    // 5. India Fintech Conclave
    {
      id: 'tier-fintech-founder',
      eventId: 'evt-fintech-disrupt',
      name: 'Startup Founder & Builder Pass',
      description: 'Full summit access including product demo stages, investor speed-dating, and networking.',
      price: 199900, // ₹1,999
      total: 250,
      avail: 180,
      res: 10,
      sold: 60,
    },
    {
      id: 'tier-fintech-exec',
      eventId: 'evt-fintech-disrupt',
      name: 'Executive Delegate & VIP Lounge Pass',
      description: 'Closed-door regulatory roundtables, private meeting suites, and dinner banquet.',
      price: 599900, // ₹5,999
      total: 80,
      avail: 55,
      res: 5,
      sold: 20,
    },

    // 6. Utsav Cultural Arts
    {
      id: 'tier-utsav-daily',
      eventId: 'evt-cultural-celebration',
      name: 'Single-Day Rasika Pass',
      description: 'Reserved auditorium admission for daily evening classical recitals.',
      price: 49900, // ₹499
      total: 300,
      avail: 220,
      res: 10,
      sold: 70,
    },
    {
      id: 'tier-utsav-season',
      eventId: 'evt-cultural-celebration',
      name: 'Full 3-Day Season Festival Pass',
      description: 'Complete season access to all morning workshops, masterclasses, and evening performances.',
      price: 149900, // ₹1,499
      total: 150,
      avail: 110,
      res: 5,
      sold: 35,
    },
  ];

  for (const t of tiers) {
    insertTier.run(
      t.id,
      t.eventId,
      t.name,
      t.description,
      t.price,
      'INR',
      t.total,
      t.avail,
      t.res,
      t.sold,
      6,
      now,
      now
    );
  }

  // 6. Pre-existing confirmed order and ticket for primary demo attendee Praveen Devaraj
  const orderId = 'ord-seed-001';
  db.prepare(`
    INSERT INTO orders (id, attendee_id, reservation_id, order_number, subtotal, fees, total_amount, currency, status, created_at, updated_at)
    VALUES (?, ?, NULL, ?, ?, ?, ?, 'INR', 'CONFIRMED', ?, ?)
  `).run(orderId, 'usr-att-01', 'ORD-2026-88192', 249900, 12500, 262400, now, now);

  const orderItemId = 'item-seed-001';
  db.prepare(`
    INSERT INTO order_items (id, order_id, ticket_tier_id, quantity, unit_price)
    VALUES (?, ?, ?, 1, 249900)
  `).run(orderItemId, orderId, 'tier-ai-general');

  const ticketCode = 'EVT-AI26-PR01';
  const qrData = `EVENTORA:v1:${ticketCode}:evt-ai-summit-2026:usr-att-01:valid`;
  db.prepare(`
    INSERT INTO tickets (id, order_item_id, attendee_id, event_id, ticket_code, qr_code_data, status, issued_at)
    VALUES (?, ?, ?, ?, ?, ?, 'VALID', ?)
  `).run('tkt-seed-001', orderItemId, 'usr-att-01', 'evt-ai-summit-2026', ticketCode, qrData, now);

  // 7. Audit Log
  db.prepare(`
    INSERT INTO audit_logs (id, actor_id, action, entity_type, entity_id, metadata, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    'log-init-01',
    'usr-admin-01',
    'SYSTEM_BOOTSTRAP',
    'PLATFORM',
    'EVENTORA',
    JSON.stringify({ message: 'Platform seeded with Indian events, venues, and Praveen as primary demo attendee.' }),
    now
  );

  console.log('[Database] Seeding completed successfully with Indian dataset.');
}

