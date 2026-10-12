export type PlanId = 'starter' | 'professional' | 'premium' | 'enterprise';
export type IndividualPlan = Exclude<PlanId, 'enterprise'>;
export type Cycle = 'monthly' | 'quarterly' | 'annual';
export type SubStatus = 'active' | 'past_due' | 'cancelled';
export type MethodType = 'upi' | 'card' | 'netbanking' | 'invoice';

export type PriceBook = Record<IndividualPlan, Record<Cycle, number>>;

export interface RevenueActivity {
  at: number;
  text: string;
  actor: string;
}

export interface Subscription {
  id: string;
  name: string;
  email: string;
  institution: string | null;
  seats: number | null;
  plan: PlanId;
  cycle: Cycle;
  amount: number;
  status: SubStatus;
  cancelAtPeriodEnd: boolean;
  pendingChange: { plan: PlanId; cycle: Cycle; amount: number } | null;
  startedAt: number;
  periodEnd: number;
  cancelledAt: number | null;
  cancelReason: string | null;
  method: MethodType;
  methodLabel: string;
  coupon: string | null;
  activity: RevenueActivity[];
}

export type PaymentStatus = 'succeeded' | 'failed' | 'refunded' | 'partially_refunded';

export interface PaymentAttempt {
  at: number;
  ok: boolean;
  note: string;
}

export interface RefundRequest {
  reason: string;
  requestedAt: number;
  status: 'pending' | 'approved' | 'rejected';
  note: string | null;
}

export interface Payment {
  id: string;
  subscriptionId: string;
  name: string;
  email: string;
  plan: PlanId;
  cycle: Cycle;
  listAmount: number;
  discount: number;
  coupon: string | null;
  amount: number;
  at: number;
  status: PaymentStatus;
  refunded: number;
  attempts: PaymentAttempt[];
  refundRequest: RefundRequest | null;
  method: MethodType;
  methodLabel: string;
  activity: RevenueActivity[];
}
