import { EMAIL_PATTERN } from '../../users/lib/shared';
import type { PlatformSettings, SectionKey, SettingErrors, SettingKey } from './types';

export { cx, formatAgo } from '../../users/lib/shared';

export const MY_IP = '49.207.48.12';

export const SECTIONS: { key: SectionKey; label: string; description: string }[] = [
  { key: 'general', label: 'General', description: 'Name, contact, regional defaults and maintenance mode' },
  { key: 'signup', label: 'Sign-up & access', description: 'Who can create an account, trials and institution matching' },
  { key: 'security', label: 'Security', description: 'Admin sign-in rules, passwords and lockouts' },
  { key: 'billing', label: 'Billing & tax', description: 'GST, invoices, failed payments and refunds' },
  { key: 'execution', label: 'Code execution', description: 'Languages and default limits for learner submissions' },
  { key: 'email', label: 'Email', description: 'How emails from eLab are sent and signed' },
];

export const SECTION_LABEL = Object.fromEntries(SECTIONS.map((section) => [section.key, section.label])) as Record<SectionKey, string>;

export const TIMEZONES = ['Asia/Kolkata', 'UTC', 'Asia/Dubai', 'Asia/Singapore', 'Europe/London', 'America/New_York'];
export const UI_LANGUAGES = ['English', 'Hindi', 'Malayalam', 'Tamil', 'Kannada'];
export const DATE_FORMATS = ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'];
export const SOCIAL = ['Google', 'GitHub', 'Microsoft'];
export const TRIAL_PLANS = ['Starter', 'Professional', 'Premium'];
export const SESSION_TIMEOUTS = [15, 30, 60, 120, 480];
export const GST_RATES = [0, 5, 12, 18, 28];
export const RETRIES = [1, 2, 3, 4, 5];
export const CODE_LANGUAGES = ['Python', 'Java', 'C', 'C++', 'JavaScript', 'TypeScript', 'Go', 'Rust', 'Kotlin', 'SQL'];
export const MEMORY_LIMITS = [128, 256, 512, 1024];
export const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export const DEFAULTS: PlatformSettings = {
  platformName: 'eLab',
  supportEmail: 'support@elab.com',
  timezone: 'Asia/Kolkata',
  language: 'English',
  dateFormat: 'DD/MM/YYYY',
  maintenance: false,
  maintenanceMessage: 'eLab is getting an upgrade. We will be back within the hour — your progress is safe.',
  allowSignup: true,
  requireVerification: true,
  socialLogins: ['Google', 'GitHub'],
  trialDays: 7,
  trialPlan: 'Professional',
  institutionDomains: ['christuniversity.in', 'nitc.ac.in', 'pes.edu'],
  maxDevices: 3,
  adminMfa: true,
  passwordMin: 10,
  passwordSymbols: true,
  sessionTimeout: 30,
  lockoutAttempts: 5,
  lockoutMinutes: 15,
  ipAllowlist: [],
  gstRate: 18,
  gstin: '29AAKCE4821M1Z6',
  invoicePrefix: 'ELB-',
  pricesInclTax: true,
  graceDays: 7,
  retryAttempts: 3,
  refundWindowDays: 7,
  languages: ['Python', 'Java', 'C', 'C++', 'JavaScript', 'TypeScript', 'Go', 'SQL'],
  timeLimit: 2,
  memoryLimit: 256,
  submissionsPerMinute: 10,
  plagiarismCheck: true,
  revealHiddenTests: false,
  senderName: 'eLab',
  senderEmail: 'no-reply@elab.com',
  replyTo: 'support@elab.com',
  emailFooter: 'eLab · Bengaluru, India. You get this email because you have an eLab account.',
  digestDay: 'Monday',
};

const onOff = (value: unknown) => (value ? 'On' : 'Off');
const list = (value: unknown) => ((value as string[]).length ? (value as string[]).join(', ') : 'None');
const unit = (suffix: string) => (value: unknown) => `${value} ${suffix}`;
const text = (value: unknown) => String(value);

interface FieldMeta {
  label: string;
  section: SectionKey;
  show: (value: unknown) => string;
  critical?: (before: unknown, after: unknown) => boolean;
}

export const FIELDS: Record<SettingKey, FieldMeta> = {
  platformName: { label: 'Platform name', section: 'general', show: text },
  supportEmail: { label: 'Support email', section: 'general', show: text },
  timezone: { label: 'Default time zone', section: 'general', show: text },
  language: { label: 'Default language', section: 'general', show: text },
  dateFormat: { label: 'Date format', section: 'general', show: text },
  maintenance: { label: 'Maintenance mode', section: 'general', show: onOff, critical: (_, after) => after === true },
  maintenanceMessage: { label: 'Maintenance message', section: 'general', show: text },
  allowSignup: { label: 'Self sign-up', section: 'signup', show: onOff, critical: (_, after) => after === false },
  requireVerification: { label: 'Email verification', section: 'signup', show: onOff, critical: (_, after) => after === false },
  socialLogins: { label: 'Social sign-in', section: 'signup', show: list },
  trialDays: { label: 'Trial length', section: 'signup', show: unit('days') },
  trialPlan: { label: 'Trial plan', section: 'signup', show: text },
  institutionDomains: { label: 'Institution email domains', section: 'signup', show: list },
  maxDevices: { label: 'Devices per learner', section: 'signup', show: text },
  adminMfa: { label: 'Two-factor for admins', section: 'security', show: (value) => (value ? 'Required' : 'Optional'), critical: (_, after) => after === false },
  passwordMin: { label: 'Minimum password length', section: 'security', show: unit('characters'), critical: (before, after) => (after as number) < (before as number) },
  passwordSymbols: { label: 'Require a number and symbol', section: 'security', show: onOff, critical: (_, after) => after === false },
  sessionTimeout: { label: 'Admin session timeout', section: 'security', show: unit('minutes') },
  lockoutAttempts: { label: 'Lock after failed sign-ins', section: 'security', show: unit('attempts') },
  lockoutMinutes: { label: 'Lockout duration', section: 'security', show: unit('minutes') },
  ipAllowlist: { label: 'Admin IP allowlist', section: 'security', show: (value) => ((value as string[]).length ? (value as string[]).join(', ') : 'Any IP'), critical: () => true },
  gstRate: { label: 'GST rate', section: 'billing', show: (value) => `${value}%` },
  gstin: { label: 'GSTIN', section: 'billing', show: text },
  invoicePrefix: { label: 'Invoice number prefix', section: 'billing', show: text },
  pricesInclTax: { label: 'Prices include GST', section: 'billing', show: onOff },
  graceDays: { label: 'Past-due grace period', section: 'billing', show: unit('days') },
  retryAttempts: { label: 'Payment retries', section: 'billing', show: text },
  refundWindowDays: { label: 'Refund window', section: 'billing', show: unit('days') },
  languages: { label: 'Enabled languages', section: 'execution', show: list },
  timeLimit: { label: 'Default time limit', section: 'execution', show: unit('seconds') },
  memoryLimit: { label: 'Default memory limit', section: 'execution', show: unit('MB') },
  submissionsPerMinute: { label: 'Submissions per minute', section: 'execution', show: text },
  plagiarismCheck: { label: 'Plagiarism check in contests', section: 'execution', show: onOff },
  revealHiddenTests: { label: 'Reveal hidden tests after contests', section: 'execution', show: onOff },
  senderName: { label: 'Sender name', section: 'email', show: text },
  senderEmail: { label: 'Sender address', section: 'email', show: text },
  replyTo: { label: 'Reply-to address', section: 'email', show: text },
  emailFooter: { label: 'Email footer', section: 'email', show: text },
  digestDay: { label: 'Weekly digest day', section: 'email', show: text },
};

export const KEYS = Object.keys(FIELDS) as SettingKey[];

export function same(a: unknown, b: unknown) {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function diff(before: PlatformSettings, after: PlatformSettings) {
  return KEYS.filter((key) => !same(before[key], after[key]));
}

export function parseList(raw: string) {
  return Array.from(new Set(raw.split(/[\s,]+/).map((item) => item.trim().toLowerCase()).filter(Boolean)));
}

const DOMAIN = /^(?!-)[a-z0-9-]{1,63}(\.[a-z0-9-]{1,63})+$/;
const GSTIN = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

function ipToInt(ip: string) {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;
  let value = 0;
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const n = Number(part);
    if (n > 255) return null;
    value = value * 256 + n;
  }
  return value;
}

export function parseCidr(entry: string) {
  const [ip, bitsRaw] = entry.split('/');
  const base = ipToInt(ip);
  if (base === null) return null;
  const bits = bitsRaw === undefined ? 32 : /^\d{1,2}$/.test(bitsRaw) ? Number(bitsRaw) : -1;
  if (bits < 8 || bits > 32) return null;
  return { base, bits };
}

export function ipAllowed(ip: string, entries: string[]) {
  const value = ipToInt(ip);
  if (value === null) return false;
  return entries.some((entry) => {
    const cidr = parseCidr(entry);
    if (!cidr) return false;
    const size = 2 ** (32 - cidr.bits);
    const start = Math.floor(cidr.base / size) * size;
    return value >= start && value < start + size;
  });
}

const intIn = (value: number, min: number, max: number) => Number.isInteger(value) && value >= min && value <= max;

export function validate(s: PlatformSettings): SettingErrors {
  const e: SettingErrors = {};
  if (s.platformName.trim().length < 2 || s.platformName.trim().length > 40) e.platformName = 'Use 2 to 40 characters';
  if (!EMAIL_PATTERN.test(s.supportEmail.trim())) e.supportEmail = 'Enter a valid email address';
  if (s.maintenance && (s.maintenanceMessage.trim().length < 10 || s.maintenanceMessage.trim().length > 200)) e.maintenanceMessage = 'Learners will see this — write 10 to 200 characters';
  if (!intIn(s.trialDays, 0, 30)) e.trialDays = 'Whole days from 0 to 30';
  const badDomain = s.institutionDomains.find((domain) => !DOMAIN.test(domain));
  if (badDomain) e.institutionDomains = `“${badDomain}” isn’t a valid domain`;
  else if (s.institutionDomains.length > 50) e.institutionDomains = 'Up to 50 domains';
  if (!intIn(s.maxDevices, 1, 10)) e.maxDevices = 'From 1 to 10';
  if (!intIn(s.passwordMin, 8, 64)) e.passwordMin = 'From 8 to 64 characters';
  if (!intIn(s.lockoutAttempts, 3, 10)) e.lockoutAttempts = 'From 3 to 10 attempts';
  if (!intIn(s.lockoutMinutes, 5, 120)) e.lockoutMinutes = 'From 5 to 120 minutes';
  const badIp = s.ipAllowlist.find((entry) => !parseCidr(entry));
  if (badIp) e.ipAllowlist = `“${badIp}” isn’t an IPv4 address or range like 103.88.226.0/24`;
  else if (s.ipAllowlist.length > 0 && !ipAllowed(MY_IP, s.ipAllowlist)) e.ipAllowlist = `Your IP (${MY_IP}) isn’t covered — saving this would lock you out`;
  if (!GSTIN.test(s.gstin.trim().toUpperCase())) e.gstin = 'A GSTIN has 15 characters, like 29AAKCE4821M1Z6';
  if (!/^[A-Z0-9-]{2,8}$/.test(s.invoicePrefix.trim())) e.invoicePrefix = '2 to 8 capital letters, numbers or dashes';
  if (!intIn(s.graceDays, 0, 30)) e.graceDays = 'Whole days from 0 to 30';
  if (!intIn(s.refundWindowDays, 0, 30)) e.refundWindowDays = 'Whole days from 0 to 30';
  if (s.languages.length === 0) e.languages = 'Keep at least one language on';
  if (!intIn(s.timeLimit, 1, 10)) e.timeLimit = 'From 1 to 10 seconds';
  if (!intIn(s.submissionsPerMinute, 1, 60)) e.submissionsPerMinute = 'From 1 to 60';
  if (s.senderName.trim().length < 2 || s.senderName.trim().length > 40) e.senderName = 'Use 2 to 40 characters';
  if (!EMAIL_PATTERN.test(s.senderEmail.trim())) e.senderEmail = 'Enter a valid email address';
  else if (!s.senderEmail.trim().toLowerCase().endsWith('@elab.com')) e.senderEmail = 'Must be an @elab.com address so emails aren’t marked as spam';
  if (!EMAIL_PATTERN.test(s.replyTo.trim())) e.replyTo = 'Enter a valid email address';
  if (s.emailFooter.trim().length > 200) e.emailFooter = 'Keep it under 200 characters';
  return e;
}

export function normalize(s: PlatformSettings): PlatformSettings {
  return {
    ...s,
    platformName: s.platformName.trim(),
    supportEmail: s.supportEmail.trim().toLowerCase(),
    maintenanceMessage: s.maintenanceMessage.trim(),
    gstin: s.gstin.trim().toUpperCase(),
    invoicePrefix: s.invoicePrefix.trim(),
    senderName: s.senderName.trim(),
    senderEmail: s.senderEmail.trim().toLowerCase(),
    replyTo: s.replyTo.trim().toLowerCase(),
    emailFooter: s.emailFooter.trim(),
  };
}
