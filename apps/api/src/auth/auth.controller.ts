import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';

import { AuthService } from './auth.service.js';
import {
  REFRESH_COOKIE,
  assertTrustedOrigin,
  clearAuthCookies,
  readCookie,
  setAuthCookies,
} from './cookies.js';
import {
  CurrentUser,
  type AuthenticatedUser,
} from './current-user.decorator.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';

function sessionMeta(req: Request) {
  return {
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  };
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(200)
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    assertTrustedOrigin(req);

    const { user, accessToken, refreshToken } = await this.authService.login(
      dto.email,
      dto.password,
      sessionMeta(req),
    );

    setAuthCookies(res, accessToken, refreshToken);

    return { user };
  }

  @Post('refresh')
  @HttpCode(200)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    assertTrustedOrigin(req);

    const token = readCookie(req, REFRESH_COOKIE);

    if (!token) {
      throw new UnauthorizedException('Refresh token is required.');
    }

    try {
      const { user, accessToken, refreshToken } =
        await this.authService.refresh(token, sessionMeta(req));

      setAuthCookies(res, accessToken, refreshToken);

      return { user };
    } catch (error) {
      clearAuthCookies(res);
      throw error;
    }
  }

  @Post('logout')
  @HttpCode(200)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    assertTrustedOrigin(req);

    const token = readCookie(req, REFRESH_COOKIE);

    if (token) {
      await this.authService.logout(token, sessionMeta(req));
    }

    clearAuthCookies(res);

    return { message: 'Signed out.' };
  }

  @Post('change-password')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  changePassword(@Body() dto: ChangePasswordDto, @CurrentUser() user: AuthenticatedUser, @Req() req: Request) {
    return this.authService.changePassword(user.id, dto.currentPassword, dto.newPassword, sessionMeta(req));
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: AuthenticatedUser) {
    return { user };
  }
}
