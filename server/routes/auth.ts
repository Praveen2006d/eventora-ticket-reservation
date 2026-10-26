/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router } from 'express';
import { db, hashPassword, verifyPassword } from '../db.ts';
import { generateTokens, verifyToken, authenticateToken, AuthenticatedRequest } from '../auth.ts';
import crypto from 'node:crypto';
import { Role } from '../types.ts';

export const authRouter = Router();

const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'eventora-refresh-secret-development-key-change-in-production-256bit';

// Register
authRouter.post('/register', (req, res) => {
  try {
    const { name, email, password, role = 'ATTENDEE', organizationName } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Name, email, and password are required.' } });
      return;
    }

    if (password.length < 8) {
      res.status(400).json({ success: false, error: { code: 'WEAK_PASSWORD', message: 'Password must be at least 8 characters long.' } });
      return;
    }

    // Role check: Only ATTENDEE and ORGANIZER can be self-registered
    const safeRole: Role = role === 'ORGANIZER' ? 'ORGANIZER' : 'ATTENDEE';

    // Check duplicate email
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase().trim());
    if (existing) {
      res.status(409).json({ success: false, error: { code: 'DUPLICATE_EMAIL', message: 'An account with this email address already exists.' } });
      return;
    }

    const userId = `usr-${crypto.randomUUID()}`;
    const passwordHash = hashPassword(password);
    const now = new Date().toISOString();

    db.exec('BEGIN IMMEDIATE');

    try {
      db.prepare(`
        INSERT INTO users (id, name, email, password_hash, role, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, 'ACTIVE', ?, ?)
      `).run(userId, name.trim(), email.toLowerCase().trim(), passwordHash, safeRole, now, now);

      let organizerProfileId: string | undefined;
      if (safeRole === 'ORGANIZER') {
        organizerProfileId = `org-${crypto.randomUUID()}`;
        db.prepare(`
          INSERT INTO organizer_profiles (id, user_id, organization_name, description, verification_status, created_at, updated_at)
          VALUES (?, ?, ?, ?, 'VERIFIED', ?, ?)
        `).run(organizerProfileId, userId, organizationName || `${name}'s Events`, 'Event creator on Eventora platform', now, now);
      }

      // Record audit log
      db.prepare(`
        INSERT INTO audit_logs (id, actor_id, action, entity_type, entity_id, metadata, created_at)
        VALUES (?, ?, 'USER_REGISTERED', 'USER', ?, ?, ?)
      `).run(crypto.randomUUID(), userId, userId, JSON.stringify({ role: safeRole, email: email.toLowerCase().trim() }), now);

      db.exec('COMMIT');

      const { accessToken, refreshToken } = generateTokens({
        id: userId,
        email: email.toLowerCase().trim(),
        role: safeRole,
      });

      // Set HttpOnly refresh token cookie
      res.cookie('refresh_token', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 3600 * 1000,
      });

      res.cookie('access_token', accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 15 * 60 * 1000,
      });

      res.status(201).json({
        success: true,
        data: {
          user: {
            id: userId,
            name: name.trim(),
            email: email.toLowerCase().trim(),
            role: safeRole,
            organizerProfileId,
          },
          accessToken,
        },
      });
    } catch (e) {
      try { db.exec('ROLLBACK'); } catch {}
      throw e;
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// Login
authRouter.post('/login', (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Email and password required.' } });
      return;
    }

    const user = db.prepare(`
      SELECT u.id, u.name, u.email, u.password_hash, u.role, u.status, op.id as organizer_profile_id
      FROM users u
      LEFT JOIN organizer_profiles op ON op.user_id = u.id
      WHERE u.email = ?
    `).get(email.toLowerCase().trim()) as any;

    if (!user || !verifyPassword(password, user.password_hash)) {
      res.status(401).json({ success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' } });
      return;
    }

    if (user.status === 'SUSPENDED') {
      res.status(403).json({ success: false, error: { code: 'ACCOUNT_SUSPENDED', message: 'Your account has been suspended by an administrator.' } });
      return;
    }

    const { accessToken, refreshToken, organizerProfileId } = generateTokens({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 3600 * 1000,
    });

    res.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000,
    });

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          organizerProfileId: organizerProfileId || user.organizer_profile_id,
        },
        accessToken,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// Logout
authRouter.post('/logout', (_req, res) => {
  res.clearCookie('refresh_token');
  res.clearCookie('access_token');
  res.json({ success: true, message: 'Logged out successfully.' });
});

// Refresh token rotation
authRouter.post('/refresh', (req, res) => {
  try {
    const refreshToken = req.cookies?.refresh_token || req.body?.refreshToken;
    if (!refreshToken) {
      res.status(401).json({ success: false, error: { code: 'NO_TOKEN', message: 'No refresh token provided.' } });
      return;
    }

    const payload = verifyToken(refreshToken, JWT_REFRESH_SECRET);
    if (!payload || !payload.userId) {
      res.status(401).json({ success: false, error: { code: 'INVALID_REFRESH_TOKEN', message: 'Refresh token expired or invalid.' } });
      return;
    }

    const user = db.prepare(`
      SELECT u.id, u.name, u.email, u.role, u.status, op.id as organizer_profile_id
      FROM users u
      LEFT JOIN organizer_profiles op ON op.user_id = u.id
      WHERE u.id = ?
    `).get(payload.userId) as any;

    if (!user || user.status === 'SUSPENDED') {
      res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Account is not active.' } });
      return;
    }

    const tokens = generateTokens({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    res.cookie('access_token', tokens.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000,
    });

    res.json({
      success: true,
      data: {
        accessToken: tokens.accessToken,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          organizerProfileId: tokens.organizerProfileId || user.organizer_profile_id,
        },
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// Current User Me
authRouter.get('/me', authenticateToken, (req: AuthenticatedRequest, res) => {
  const user = db.prepare(`
    SELECT u.id, u.name, u.email, u.role, u.status, u.created_at, op.id as organizer_profile_id, op.organization_name
    FROM users u
    LEFT JOIN organizer_profiles op ON op.user_id = u.id
    WHERE u.id = ?
  `).get(req.user!.userId) as any;

  if (!user) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found.' } });
    return;
  }

  // Active reservations count
  const activeReservations = db.prepare(`
    SELECT COUNT(*) as count FROM reservations
    WHERE attendee_id = ? AND status = 'HELD' AND expires_at > ?
  `).get(user.id, new Date().toISOString()) as { count: number };

  res.json({
    success: true,
    data: {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        createdAt: user.created_at,
        organizerProfileId: user.organizer_profile_id,
        organizationName: user.organization_name,
        activeReservationsCount: activeReservations.count,
      },
    },
  });
});
