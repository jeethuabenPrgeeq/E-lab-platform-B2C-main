import type { DistributionItem, Metric } from '../types';

export interface TimeSeries {
  labels: string[];
  values: number[];
}

export interface SuperAdminDashboardData {
  activeUsersTrend: TimeSeries;
  subscriptionFlow: { labels: string[]; started: number[]; cancelled: number[] };
  revenueTrend: TimeSeries;
  updatedAt: string;
  highlights: Metric[];
  userTotals: Metric[];
  engagement: Metric[];
  accountStatus: DistributionItem[];
  subscriptions: Metric[];
  planDistribution: DistributionItem[];
  billingCycles: DistributionItem[];
  revenue: Metric[];
  transactions: Metric[];
}

export const superAdminDashboard: SuperAdminDashboardData = {
  activeUsersTrend: {
    labels: ['Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'],
    values: [6120, 6340, 6580, 6900, 7150, 7420, 7780, 8100, 8460, 8900, 9410, 9870],
  },
  subscriptionFlow: {
    labels: ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'],
    started: [210, 228, 241, 255, 270, 286],
    cancelled: [52, 48, 45, 44, 41, 39],
  },
  revenueTrend: {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'],
    values: [540000, 565000, 590000, 610000, 640000, 665000, 690000, 735000, 908700, 896300],
  },
  updatedAt: '01 Oct 2026, 10:30 IST',
  highlights: [
    { key: 'mrr', label: 'MRR', value: 842000, format: 'currency', tone: 'primary' },
    { key: 'paymentsToday', label: 'Payments today', value: 48500, format: 'currency', tone: 'success' },
    { key: 'failedPayments', label: 'Failed payments', value: 17, tone: 'danger' },
    { key: 'refundRequests', label: 'Refund requests', value: 4, tone: 'warning' },
    { key: 'renewalsDue', label: 'Renewals due', value: 132, tone: 'neutral' },
  ],
  userTotals: [
    { key: 'totalRegistered', label: 'Total registered users', value: 18420, tone: 'primary' },
    { key: 'activeUsers', label: 'Active users', value: 9870, tone: 'success' },
    { key: 'paidUsers', label: 'Paid users', value: 4305, tone: 'primary' },
    { key: 'userGrowth', label: 'User growth', value: 6.4, format: 'percent', tone: 'success' },
  ],
  engagement: [
    { key: 'newToday', label: 'New users today', value: 64 },
    { key: 'newThisWeek', label: 'New users this week', value: 412 },
    { key: 'newThisMonth', label: 'New users this month', value: 1586 },
    { key: 'dau', label: 'Daily active users', value: 3240, tone: 'primary' },
    { key: 'wau', label: 'Weekly active users', value: 7180, tone: 'primary' },
    { key: 'mau', label: 'Monthly active users', value: 9870, tone: 'primary' },
  ],
  accountStatus: [
    { key: 'free', label: 'Free users', value: 11240, tone: 'neutral' },
    { key: 'paid', label: 'Paid users', value: 4305, tone: 'primary' },
    { key: 'trial', label: 'Trial users', value: 1860, tone: 'success' },
    { key: 'suspended', label: 'Suspended users', value: 215, tone: 'warning' },
    { key: 'deactivated', label: 'Deleted / deactivated', value: 800, tone: 'danger' },
  ],
  subscriptions: [
    { key: 'active', label: 'Active subscriptions', value: 4305, tone: 'primary' },
    { key: 'new', label: 'New subscriptions', value: 286, tone: 'success' },
    { key: 'renewals', label: 'Renewals', value: 418, tone: 'success' },
    { key: 'expiring', label: 'Expiring subscriptions', value: 132, tone: 'warning' },
    { key: 'cancelled', label: 'Cancelled subscriptions', value: 39, tone: 'danger' },
    { key: 'trialConversions', label: 'Trial conversions', value: 174 },
    { key: 'freeToPaid', label: 'Free-to-paid conversion', value: 4.8, format: 'percent' },
  ],
  planDistribution: [
    { key: 'starter', label: 'Starter', value: 2450, tone: 'neutral' },
    { key: 'professional', label: 'Professional', value: 1280, tone: 'primary' },
    { key: 'premium', label: 'Premium', value: 540, tone: 'success' },
    { key: 'enterprise', label: 'Enterprise', value: 35, tone: 'warning' },
  ],
  billingCycles: [
    { key: 'monthly', label: 'Monthly plan users', value: 2980, tone: 'primary' },
    { key: 'quarterly', label: 'Quarterly plan users', value: 610, tone: 'primary' },
    { key: 'annual', label: 'Annual plan users', value: 715, tone: 'primary' },
  ],
  revenue: [
    { key: 'revenueToday', label: 'Revenue today', value: 48500, format: 'currency' },
    { key: 'revenueMonth', label: 'Revenue this month', value: 896300, format: 'currency' },
    { key: 'revenueYear', label: 'Revenue this year', value: 6840000, format: 'currency' },
    { key: 'mrr', label: 'Monthly recurring revenue', value: 842000, format: 'currency', tone: 'primary' },
    { key: 'arr', label: 'Annual recurring revenue', value: 10104000, format: 'currency', tone: 'primary' },
  ],
  transactions: [
    { key: 'successful', label: 'Successful transactions', value: 1248, tone: 'success' },
    { key: 'failed', label: 'Failed transactions', value: 17, tone: 'danger' },
    { key: 'pending', label: 'Pending payments', value: 23, tone: 'warning' },
    { key: 'refunds', label: 'Refunds', value: 4, tone: 'warning' },
    { key: 'chargebacks', label: 'Chargebacks', value: 1, tone: 'danger' },
    { key: 'outstandingInvoices', label: 'Outstanding invoices', value: 36, tone: 'warning' },
    { key: 'taxCollected', label: 'Tax collected', value: 161334, format: 'currency' },
    { key: 'discountsGiven', label: 'Discounts given', value: 52400, format: 'currency' },
    { key: 'couponUsage', label: 'Coupon usage', value: 212 },
  ],
};