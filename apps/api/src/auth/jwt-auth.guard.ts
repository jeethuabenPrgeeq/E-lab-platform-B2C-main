import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { PrismaService } from '../prisma/prisma.service.js';
import { ACCESS_COOKIE, assertTrustedOrigin, readCookie } from './cookies.js';
import type { AuthenticatedRequest } from './current-user.decorator.js';
import { toAppRole } from './roles.js';

const PASSWORD_CHANGE_PATHS = ['/auth/change-password', '/auth/me'];

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    assertTrustedOrigin(request);

    const bearer = request.headers.authorization?.startsWith('Bearer ')
      ? request.headers.authorization.slice(7)
      : undefined;

    const token = readCookie(request, ACCESS_COOKIE) ?? bearer;

    if (!token) {
      throw new UnauthorizedException('Authentication is required.');
    }

    let subject: string | undefined;

    try {
      const payload = await this.jwtService.verifyAsync<{ sub?: string }>(token);
      subject = payload.sub;
    } catch {
      throw new UnauthorizedException('Invalid or expired token.');
    }

    if (!subject) {
      throw new UnauthorizedException('Invalid or expired token.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: subject },
        select: { id: true, email: true, name: true, role: true, status: true, mustChangePassword: true },
    }); 

    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Account is not active.');
    }

    request.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: toAppRole(user.role),
      mustChangePassword: user.mustChangePassword,
    };

    if (user.mustChangePassword && !PASSWORD_CHANGE_PATHS.some((path) => request.path.endsWith(path))) {
      throw new ForbiddenException('Change your temporary password before continuing.');
    }

    return true;
  }
}