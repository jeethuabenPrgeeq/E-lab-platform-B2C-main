export const SECTIONS = [
  'general',
  'signup',
  'security',
  'billing',
  'execution',
  'email',
] as const;
export type SectionKey = (typeof SECTIONS)[number];

type Value = string | number | boolean | string[];

interface Field {
  label: string;
  section: SectionKey;
  critical?: (before: Value, after: Value) => boolean;
}

export const DEFAULTS: Record<string, Value> = {
  platformName: 'eLab',
  supportEmail: 'support@elab.com',
  timezone: 'Asia/Kolkata',
  language: 'English',
  dateFormat: 'DD/MM/YYYY',
  maintenance: false,
  maintenanceMessage:
    'eLab is getting an upgrade. We will be back within the hour. Your progress is safe.',
  allowSignup: true,
  requireVerification: true,
  socialLogins: ['Google', 'GitHub'],
  trialDays: 7,
  trialPlan: 'Professional',
  institutionDomains: [],
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
  languages: [
    'Python',
    'Java',
    'C',
    'C++',
    'JavaScript',
    'TypeScript',
    'Go',
    'SQL',
  ],
  timeLimit: 2,
  memoryLimit: 256,
  submissionsPerMinute: 10,
  plagiarismCheck: true,
  revealHiddenTests: false,
  senderName: 'eLab',
  senderEmail: 'no-reply@elab.com',
  replyTo: 'support@elab.com',
  emailFooter:
    'eLab · Bengaluru, India. You get this email because you have an eLab account.',
  digestDay: 'Monday',
};

export const FIELDS: Record<string, Field> = {
  platformName: { label: 'Platform name', section: 'general' },
  supportEmail: { label: 'Support email', section: 'general' },
  timezone: { label: 'Default time zone', section: 'general' },
  language: { label: 'Default language', section: 'general' },
  dateFormat: { label: 'Date format', section: 'general' },
  maintenance: {
    label: 'Maintenance mode',
    section: 'general',
    critical: (_, after) => after === true,
  },
  maintenanceMessage: { label: 'Maintenance message', section: 'general' },
  allowSignup: {
    label: 'Self sign-up',
    section: 'signup',
    critical: (_, after) => after === false,
  },
  requireVerification: {
    label: 'Email verification',
    section: 'signup',
    critical: (_, after) => after === false,
  },
  socialLogins: { label: 'Social sign-in', section: 'signup' },
  trialDays: { label: 'Trial length', section: 'signup' },
  trialPlan: { label: 'Trial plan', section: 'signup' },
  institutionDomains: { label: 'Institution email domains', section: 'signup' },
  maxDevices: { label: 'Devices per learner', section: 'signup' },
  adminMfa: {
    label: 'Two-factor for admins',
    section: 'security',
    critical: (_, after) => after === false,
  },
  passwordMin: {
    label: 'Minimum password length',
    section: 'security',
    critical: (before, after) => (after as number) < (before as number),
  },
  passwordSymbols: {
    label: 'Require a number and symbol',
    section: 'security',
    critical: (_, after) => after === false,
  },
  sessionTimeout: { label: 'Admin session timeout', section: 'security' },
  lockoutAttempts: { label: 'Lock after failed sign-ins', section: 'security' },
  lockoutMinutes: { label: 'Lockout duration', section: 'security' },
  ipAllowlist: {
    label: 'Admin IP allowlist',
    section: 'security',
    critical: () => true,
  },
  gstRate: { label: 'GST rate', section: 'billing' },
  gstin: { label: 'GSTIN', section: 'billing' },
  invoicePrefix: { label: 'Invoice number prefix', section: 'billing' },
  pricesInclTax: { label: 'Prices include GST', section: 'billing' },
  graceDays: { label: 'Past-due grace period', section: 'billing' },
  retryAttempts: { label: 'Payment retries', section: 'billing' },
  refundWindowDays: { label: 'Refund window', section: 'billing' },
  languages: {
    label: 'Enabled languages',
    section: 'execution',
    critical: (before, after) =>
      (before as string[]).some((item) => !(after as string[]).includes(item)),
  },
  timeLimit: { label: 'Default time limit', section: 'execution' },
  memoryLimit: { label: 'Default memory limit', section: 'execution' },
  submissionsPerMinute: {
    label: 'Submissions per minute',
    section: 'execution',
  },
  plagiarismCheck: {
    label: 'Plagiarism check in contests',
    section: 'execution',
  },
  revealHiddenTests: {
    label: 'Reveal hidden tests after contests',
    section: 'execution',
    critical: (_, after) => after === true,
  },
  senderName: { label: 'Sender name', section: 'email' },
  senderEmail: { label: 'Sender address', section: 'email' },
  replyTo: { label: 'Reply-to address', section: 'email' },
  emailFooter: { label: 'Email footer', section: 'email' },
  digestDay: { label: 'Weekly digest day', section: 'email' },
};

export const OPTIONS: Record<string, readonly (string | number)[]> = {
  timezone: [
    'Asia/Kolkata',
    'UTC',
    'Asia/Dubai',
    'Asia/Singapore',
    'Europe/London',
    'America/New_York',
  ],
  language: ['English', 'Hindi', 'Malayalam', 'Tamil', 'Kannada'],
  dateFormat: ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'],
  socialLogins: ['Google', 'GitHub', 'Microsoft'],
  trialPlan: ['Starter', 'Professional', 'Premium'],
  sessionTimeout: [15, 30, 60, 120, 480],
  gstRate: [0, 5, 12, 18, 28],
  retryAttempts: [1, 2, 3, 4, 5],
  languages: [
    'Python',
    'Java',
    'C',
    'C++',
    'JavaScript',
    'TypeScript',
    'Go',
    'Rust',
    'Kotlin',
    'SQL',
  ],
  memoryLimit: [128, 256, 512, 1024],
  digestDay: [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday',
  ],
};

export const keysOf = (section: SectionKey) =>
  Object.keys(FIELDS).filter((key) => FIELDS[key].section === section);

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const DOMAIN = /^(?!-)[a-z0-9-]{1,63}(\.[a-z0-9-]{1,63})+$/;
const GSTIN = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const intIn = (value: unknown, min: number, max: number) =>
  typeof value === 'number' &&
  Number.isInteger(value) &&
  value >= min &&
  value <= max;

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
  const bits =
    bitsRaw === undefined
      ? 32
      : /^\d{1,2}$/.test(bitsRaw)
        ? Number(bitsRaw)
        : -1;
  if (bits < 8 || bits > 32) return null;
  return { base, bits };
}

export function normalizeIp(ip: string | null) {
  if (!ip) return null;
  if (ip === '::1') return '127.0.0.1';
  return ip.startsWith('::ffff:') ? ip.slice(7) : ip;
}

export function ipAllowed(ip: string | null, entries: string[]) {
  const value = ip ? ipToInt(ip) : null;
  if (value === null) return false;
  return entries.some((entry) => {
    const cidr = parseCidr(entry);
    if (!cidr) return false;
    const size = 2 ** (32 - cidr.bits);
    const start = Math.floor(cidr.base / size) * size;
    return value >= start && value < start + size;
  });
}

export function coerce(key: string, raw: unknown): Value | undefined {
  const fallback = DEFAULTS[key];
  if (Array.isArray(fallback)) {
    if (!Array.isArray(raw) || raw.some((item) => typeof item !== 'string'))
      return undefined;
    const lower = key === 'institutionDomains' || key === 'ipAllowlist';
    return [
      ...new Set(
        (raw as string[])
          .map((item) => (lower ? item.trim().toLowerCase() : item.trim()))
          .filter(Boolean),
      ),
    ];
  }
  if (typeof fallback === 'number')
    return typeof raw === 'number' && Number.isFinite(raw) ? raw : undefined;
  if (typeof fallback === 'boolean')
    return typeof raw === 'boolean' ? raw : undefined;
  if (typeof raw !== 'string') return undefined;
  const trimmed = raw.trim();
  if (key === 'gstin') return trimmed.toUpperCase();
  if (key === 'supportEmail' || key === 'senderEmail' || key === 'replyTo')
    return trimmed.toLowerCase();
  return trimmed;
}

export function validate(
  section: SectionKey,
  s: Record<string, Value>,
  actorIp: string | null,
) {
  const e: Record<string, string> = {};
  for (const key of keysOf(section)) {
    const allowed = OPTIONS[key];
    if (!allowed) continue;
    const value = s[key];
    const bad = Array.isArray(value)
      ? value.find((item) => !allowed.includes(item))
      : allowed.includes(value as string | number)
        ? undefined
        : value;
    if (bad !== undefined) e[key] = `"${bad}" is not an allowed value`;
  }
  const str = (key: string) => String(s[key] ?? '');
  if (section === 'general') {
    if (str('platformName').length < 2 || str('platformName').length > 40)
      e.platformName = 'Use 2 to 40 characters';
    if (!EMAIL.test(str('supportEmail')))
      e.supportEmail = 'Enter a valid email address';
    if (
      s.maintenance &&
      (str('maintenanceMessage').length < 10 ||
        str('maintenanceMessage').length > 200)
    )
      e.maintenanceMessage =
        'Learners will see this. Write 10 to 200 characters';
  }
  if (section === 'signup') {
    if (!intIn(s.trialDays, 0, 30)) e.trialDays = 'Whole days from 0 to 30';
    const domains = s.institutionDomains as string[];
    const badDomain = domains.find((domain) => !DOMAIN.test(domain));
    if (badDomain) e.institutionDomains = `"${badDomain}" isn't a valid domain`;
    else if (domains.length > 50) e.institutionDomains = 'Up to 50 domains';
    if (!intIn(s.maxDevices, 1, 10)) e.maxDevices = 'From 1 to 10';
  }
  if (section === 'security') {
    if (!intIn(s.passwordMin, 8, 64)) e.passwordMin = 'From 8 to 64 characters';
    if (!intIn(s.lockoutAttempts, 3, 10))
      e.lockoutAttempts = 'From 3 to 10 attempts';
    if (!intIn(s.lockoutMinutes, 5, 120))
      e.lockoutMinutes = 'From 5 to 120 minutes';
    const list = s.ipAllowlist as string[];
    const badIp = list.find((entry) => !parseCidr(entry));
    if (badIp)
      e.ipAllowlist = `"${badIp}" isn't an IPv4 address or range like 103.88.226.0/24`;
    else if (list.length > 0 && !ipAllowed(actorIp, list))
      e.ipAllowlist = `Your IP (${actorIp ?? 'unknown'}) isn't covered. Saving this would lock you out`;
  }
  if (section === 'billing') {
    if (!GSTIN.test(str('gstin')))
      e.gstin = 'A GSTIN has 15 characters, like 29AAKCE4821M1Z6';
    if (!/^[A-Z0-9-]{2,8}$/.test(str('invoicePrefix')))
      e.invoicePrefix = '2 to 8 capital letters, numbers or dashes';
    if (!intIn(s.graceDays, 0, 30)) e.graceDays = 'Whole days from 0 to 30';
    if (!intIn(s.refundWindowDays, 0, 30))
      e.refundWindowDays = 'Whole days from 0 to 30';
  }
  if (section === 'execution') {
    if ((s.languages as string[]).length === 0)
      e.languages = 'Keep at least one language on';
    if (!intIn(s.timeLimit, 1, 10)) e.timeLimit = 'From 1 to 10 seconds';
    if (!intIn(s.submissionsPerMinute, 1, 60))
      e.submissionsPerMinute = 'From 1 to 60';
  }
  if (section === 'email') {
    if (str('senderName').length < 2 || str('senderName').length > 40)
      e.senderName = 'Use 2 to 40 characters';
    if (!EMAIL.test(str('senderEmail')))
      e.senderEmail = 'Enter a valid email address';
    else if (!str('senderEmail').endsWith('@elab.com'))
      e.senderEmail =
        "Must be an @elab.com address so emails aren't marked as spam";
    if (!EMAIL.test(str('replyTo'))) e.replyTo = 'Enter a valid email address';
    if (str('emailFooter').length > 200)
      e.emailFooter = 'Keep it under 200 characters';
  }
  return e;
}

export function show(value: Value) {
  if (Array.isArray(value)) return value.length ? value.join(', ') : 'None';
  if (typeof value === 'boolean') return value ? 'On' : 'Off';
  return String(value);
}
