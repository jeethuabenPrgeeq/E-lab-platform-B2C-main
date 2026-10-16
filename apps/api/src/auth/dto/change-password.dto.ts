import { IsString, MaxLength, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  currentPassword!: string;

  @IsString()
  @MinLength(10, { message: 'Use at least 10 characters for the new password.' })
  @MaxLength(128)
  newPassword!: string;
}