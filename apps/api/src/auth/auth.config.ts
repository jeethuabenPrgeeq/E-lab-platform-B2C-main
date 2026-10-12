export const authConfig = {
  accessMinutes: (): number => Number(process.env.ACCESS_TOKEN_MINUTES ?? 15),
  refreshDays: (): number => Number(process.env.REFRESH_TOKEN_DAYS ?? 7),
  secret: (): string => {
    const secret = process.env.JWT_ACCESS_SECRET;

    if (!secret || secret.length < 32) {
      throw new Error('JWT_ACCESS_SECRET must be set to at least 32 characters.');
    }

    return secret;
  },
};