/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Request, Response, NextFunction } from 'express';
import crypto from 'node:crypto';
import { db } from './db.ts';
import { User, Role } from './types.ts';

const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'eventora-access-secret-development-key-change-in-production-256bit';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'eventora-refresh-secret-development-key-change-in-production-256bit';

export interface AuthPayload {
  userId: string;
  email: string;
  role: Role;
  organizerProfileId?: string;
  exp: number;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthPayload;
}

/**
 * Sign standard base64url JSON token with HMAC-SHA256 signature
 */
export function signToken(payload: object, secret: string, expiresInSeconds: number): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const fullPayload = { ...payload, exp };

  const encode = (obj: object) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  const unsignedToken = `${encode(header)}.${encode(fullPayload)}`;
  const signature = crypto.createHmac('sha256', secret).update(unsignedToken).digest('base64url');

  return `${unsignedToken}.${signature}`;
}

export function verifyToken(token: string, secret: string): any | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [headerB64, payloadB64, signature] = parts;
    const unsignedToken = `${headerB64}.${payloadB64}`;
    const expectedSig = crypto.createHmac('sha256', secret).update(unsignedToken).digest('base64url');

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
      return null;
    }

    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf-8'));
    if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) {
      return null; // Expired
    }

    return payload;
  } catch {
    return null;
  }
}

export function generateTokens(user: { id: string; email: string; role: Role }) {
  // Check if organizer profile exists
  let organizerProfileId: string | undefined;
  if (user.role === 'ORGANIZER') {
    const profile = db.prepare('SELECT id FROM organizer_profiles WHERE user_id = ?').get(user.id) as { id: string } | undefined;
    if (profile) {
      organizerProfileId = profile.id;
    }
  }

  const accessPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    organizerProfileId,
  };

  const accessToken = signToken(accessPayload, JWT_ACCESS_SECRET, 15 * 60); // 15 mins
  const refreshToken = signToken({ userId: user.id }, JWT_REFRESH_SECRET, 7 * 24 * 3600); // 7 days

  return { accessToken, refreshToken, organizerProfileId };
}

/**
 * Authentication middleware
 */
export function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  let token: string | undefined;

  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if (req.cookies && req.cookies.access_token) {
    token = req.cookies.access_token;
  }

  if (!token) {
    res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication required. No token provided.' },
    });
    return;
  }

  const payload = verifyToken(token, JWT_ACCESS_SECRET) as AuthPayload | null;
  if (!payload) {
    res.status(401).json({
      success: false,
      error: { code: 'INVALID_TOKEN', message: 'Token is expired or invalid.' },
    });
    return;
  }

  // Verify user still active in DB
  const user = db.prepare('SELECT id, status, role FROM users WHERE id = ?').get(payload.userId) as User | undefined;
  if (!user || user.status === 'SUSPENDED') {
    res.status(403).json({
      success: false,
      error: { code: 'ACCOUNT_SUSPENDED', message: 'User account is suspended or inactive.' },
    });
    return;
  }

  req.user = {
    ...payload,
    role: user.role, // Always fresh from DB
  };
  next();
}

/**
 * Role-Based Access Control (RBAC) middleware
 */
export function requireRole(...roles: Role[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Login required.' } });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: `Access denied. Requires one of [${roles.join(', ')}] permissions. Current role: ${req.user.role}`,
        },
      });
      return;
    }

    next();
  };
}

/**
 * Multi-Tenant Isolation Middleware: verifies current organizer owns the specified event
 */
export function requireOrganizerEventOwnership(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const eventId = req.params.id || req.body.eventId;
  if (!eventId) {
    res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'Event ID required.' } });
    return;
  }

  const event = db.prepare('SELECT organizer_id FROM events WHERE id = ?').get(eventId) as { organizer_id: string } | undefined;
  if (!event) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Event not found.' } });
    return;
  }

  // Admins can inspect any event
  if (req.user?.role === 'ADMIN') {
    return next();
  }

  if (!req.user?.organizerProfileId || req.user.organizerProfileId !== event.organizer_id) {
    res.status(403).json({
      success: false,
      error: {
        code: 'TENANT_VIOLATION',
        message: 'Forbidden. You do not have permission to manage this organizer event.',
      },
    });
    return;
  }

  next();
}
