import { ForbiddenException } from '@nestjs/common';
import type { Request, Response } from 'express';

import { authConfig } from './auth.config.js';

export const ACCESS_COOKIE = 'elab_access';
export const REFRESH_COOKIE = 'elab_refresh';

const REFRESH_PATH = '/api/v1/auth';

function cookieBase() {
  const sameSite = (process.env.COOKIE_SAMESITE ?? 'lax') as 'lax' | 'strict' | 'none';
  const secure = process.env.COOKIE_SECURE === 'true' || sameSite === 'none';

  return { httpOnly: true, secure, sameSite };
}

export function setAuthCookies(res: Response, accessToken: string, refreshToken: string): void {
  res.cookie(ACCESS_COOKIE, accessToken, {
    ...cookieBase(),
    path: '/',
    maxAge: authConfig.accessMinutes() * 60 * 1000,
  });

  res.cookie(REFRESH_COOKIE, refreshToken, {
    ...cookieBase(),
    path: REFRESH_PATH,
    maxAge: authConfig.refreshDays() * 24 * 60 * 60 * 1000,
  });
}

export function clearAuthCookies(res: Response): void {
  res.clearCookie(ACCESS_COOKIE, { ...cookieBase(), path: '/' });
  res.clearCookie(REFRESH_COOKIE, { ...cookieBase(), path: REFRESH_PATH });
}

export function readCookie(req: Request, name: string): string | undefined {
  const header = req.headers.cookie;

  if (!header) {
    return undefined;
  }

  for (const part of header.split(';')) {
    const index = part.indexOf('=');

    if (index < 0 || part.slice(0, index).trim() !== name) {
      continue;
    }

    try {
      return decodeURIComponent(part.slice(index + 1).trim());
    } catch {
      return undefined;
    }
  }

  return undefined;
}

export function assertTrustedOrigin(req: Request): void {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return;
  }

  const origin = req.headers.origin;
  const allowed = process.env.FRONTEND_URL ?? 'http://localhost:3000';

  if (origin && origin !== allowed) {
    throw new ForbiddenException('Untrusted origin.');
  }
}