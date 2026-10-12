export type SectionKey = 'general' | 'signup' | 'security' | 'billing' | 'execution' | 'email';

export interface PlatformSettings {
  platformName: string;
  supportEmail: string;
  timezone: string;
  language: string;
  dateFormat: string;
  maintenance: boolean;
  maintenanceMessage: string;
  allowSignup: boolean;
  requireVerification: boolean;
  socialLogins: string[];
  trialDays: number;
  trialPlan: string;
  institutionDomains: string[];
  maxDevices: number;
  adminMfa: boolean;
  passwordMin: number;
  passwordSymbols: boolean;
  sessionTimeout: number;
  lockoutAttempts: number;
  lockoutMinutes: number;
  ipAllowlist: string[];
  gstRate: number;
  gstin: string;
  invoicePrefix: string;
  pricesInclTax: boolean;
  graceDays: number;
  retryAttempts: number;
  refundWindowDays: number;
  languages: string[];
  timeLimit: number;
  memoryLimit: number;
  submissionsPerMinute: number;
  plagiarismCheck: boolean;
  revealHiddenTests: boolean;
  senderName: string;
  senderEmail: string;
  replyTo: string;
  emailFooter: string;
  digestDay: string;
}

export type SettingKey = keyof PlatformSettings;

export interface SectionMeta {
  at: number;
  by: string;
}

export interface SettingsState {
  values: PlatformSettings;
  meta: Record<SectionKey, SectionMeta>;
}

export type SettingErrors = Partial<Record<SettingKey, string>>;
