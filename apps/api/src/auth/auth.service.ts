import {
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'node:crypto';

import { PrismaService } from '../prisma/prisma.service.js';
import { authConfig } from './auth.config.js';
import { toAppRole, type AppRole } from './roles.js';

interface SessionMeta {
  ipAddress?: string;
  userAgent?: string;
}

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: AppRole;
}

interface Tokens {
  user: SessionUser;
  accessToken: string;
  refreshToken: string;
}

interface TokenSubject {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface AuthEvent {
  action: string;
  actorId: string | null;
  email: string;
  summary: string;
  outcome: 'success' | 'failure';
}

const ADMIN_ROLES = new Set(['SUPER_ADMIN', 'PLATFORM_ADMIN', 'INSTITUTE_ADMIN']);
const MAX_FAILURES = 5;
const WINDOW_MS = 15 * 60 * 1000;
const MAX_TRACKED_KEYS = 5000;
const DUMMY_HASH = bcrypt.hashSync('elab-dummy-password', 12);

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

@Injectable()
export class AuthService {
  private readonly failures = new Map<string, { count: number; resetAt: number }>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(email: string, password: string, meta: SessionMeta): Promise<Tokens> {
    const normalizedEmail = email.trim().toLowerCase();
    const key = `${normalizedEmail}|${meta.ipAddress ?? ''}`;

    try {
      this.assertNotLimited(key);
    } catch (error) {
      await this.log(meta, { action: 'auth.blocked', actorId: null, email: normalizedEmail, summary: `Blocked a sign-in for ${normalizedEmail} after too many failed attempts`, outcome: 'failure' });
      throw error;
    }

    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    const passwordMatches = await bcrypt.compare(
      password,
      user?.passwordHash ?? DUMMY_HASH,
    );

    if (!user || !passwordMatches || user.status !== 'ACTIVE') {
      this.recordFailure(key);
      const reason = !user ? 'no account with that email' : !passwordMatches ? 'wrong password' : `account is ${user.status.toLowerCase()}`;
      await this.log(meta, { action: 'auth.login_failed', actorId: user?.id ?? null, email: normalizedEmail, summary: `Failed sign-in for ${normalizedEmail}: ${reason}`, outcome: 'failure' });
      throw new UnauthorizedException('Invalid email or password.');
    }

    this.failures.delete(key);

    if (ADMIN_ROLES.has(user.role)) {
      await this.log(meta, { action: 'auth.login', actorId: user.id, email: user.email, summary: `${user.name} signed in`, outcome: 'success' });
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return this.issueTokens(user, meta);
  }

  async refresh(rawToken: string, meta: SessionMeta): Promise<Tokens> {
    const session = await this.prisma.refreshSession.findUnique({
      where: { tokenHash: hashToken(rawToken) },
      include: { user: true },
    });

    if (!session) {
      throw new UnauthorizedException('Invalid refresh token.');
    }

    const revoked = await this.prisma.refreshSession.updateMany({
      where: { id: session.id, revokedAt: null, expiresAt: { gt: new Date() } },
      data: { revokedAt: new Date() },
    });

    if (revoked.count === 0) {
      if (session.revokedAt) {
        await this.prisma.refreshSession.updateMany({
          where: { userId: session.userId, revokedAt: null },
          data: { revokedAt: new Date() },
        });
        await this.log(meta, { action: 'auth.token_reuse', actorId: session.userId, email: session.user.email, summary: `A used refresh token was presented again for ${session.user.email}. All sessions were signed out`, outcome: 'failure' });
      }

      throw new UnauthorizedException('Refresh token is no longer valid.');
    }

    if (session.user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Account is not active.');
    }

    return this.issueTokens(session.user, meta);
  }

  async logout(rawToken: string, meta: SessionMeta = {}): Promise<void> {
    const session = await this.prisma.refreshSession.findUnique({
      where: { tokenHash: hashToken(rawToken) },
      include: { user: { select: { id: true, name: true, email: true, role: true } } },
    });

    await this.prisma.refreshSession.updateMany({
      where: { tokenHash: hashToken(rawToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });

    if (session && !session.revokedAt && ADMIN_ROLES.has(session.user.role)) {
      await this.log(meta, { action: 'auth.logout', actorId: session.user.id, email: session.user.email, summary: `${session.user.name} signed out`, outcome: 'success' });
    }
  }

  private async log(meta: SessionMeta, event: AuthEvent): Promise<void> {
    await this.prisma.technicalAuditLog
      .create({
        data: {
          actorId: event.actorId,
          actorEmail: event.email,
          action: event.action,
          entityType: 'auth',
          entityId: event.actorId ?? event.email,
          summary: event.summary.slice(0, 500),
          ipAddress: meta.ipAddress,
          userAgent: meta.userAgent?.slice(0, 255),
          outcome: event.outcome,
        },
      })
      .catch(() => undefined);
  }

  private async issueTokens(user: TokenSubject, meta: SessionMeta): Promise<Tokens> {
    const refreshToken = randomBytes(48).toString('base64url');
    const expiresAt = new Date(
      Date.now() + authConfig.refreshDays() * 24 * 60 * 60 * 1000,
    );

    await this.prisma.refreshSession.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(refreshToken),
        expiresAt,
        userAgent: meta.userAgent?.slice(0, 255),
        ipAddress: meta.ipAddress,
      },
    });

    const accessToken = await this.jwtService.signAsync({ sub: user.id });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: toAppRole(user.role),
      },
      accessToken,
      refreshToken,
    };
  }

  private assertNotLimited(key: string): void {
    const entry = this.failures.get(key);

    if (!entry) {
      return;
    }

    if (entry.resetAt <= Date.now()) {
      this.failures.delete(key);
      return;
    }

    if (entry.count >= MAX_FAILURES) {
      throw new HttpException(
        'Too many failed attempts. Try again later.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private recordFailure(key: string): void {
    const now = Date.now();

    if (this.failures.size >= MAX_TRACKED_KEYS) {
      for (const [trackedKey, value] of this.failures) {
        if (value.resetAt <= now) {
          this.failures.delete(trackedKey);
        }
      }
    }

    const entry = this.failures.get(key);

    if (!entry || entry.resetAt <= now) {
      this.failures.set(key, { count: 1, resetAt: now + WINDOW_MS });
      return;
    }

    entry.count += 1;
  }
}