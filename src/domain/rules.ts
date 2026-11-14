import { BookingStatus, Category, ItemCondition, TransactionType } from './types';

export const CATEGORIES: Category[] = [
  'Cameras and creator gear',
  'Travel and luggage',
  'Tools and DIY',
  'Kitchen and appliances',
  'Party and event supplies',
  'Sports and outdoor',
  'Books and study',
  'Electronics and gadgets',
  'Furniture and decor',
  'Musical instruments',
  'Kids and baby',
  'Other',
];

export const CONDITIONS: ItemCondition[] = ['New', 'Like new', 'Good', 'Fair'];

export const DEFAULT_COMMISSION_PCT = 0.08; // 8%

export const ZERO_BOOKING_THRESHOLD_DAYS = 14;

/**
 * State machine for bookings.
 * Allowed transitions only:
 * - pending -> approved, rejected, cancelled
 * - approved -> cancelled, completed
 * - rejected, cancelled, completed are terminal.
 */
export function isValidStatusTransition(from: BookingStatus, to: BookingStatus): boolean {
  if (from === 'pending') {
    return to === 'approved' || to === 'rejected' || to === 'cancelled';
  }
  if (from === 'approved') {
    return to === 'cancelled' || to === 'completed';
  }
  return false;
}

/**
 * Calculates inclusive number of calendar days between YYYY-MM-DD strings.
 * Example: 2026-11-01 to 2026-11-01 is 1 day.
 * Example: 2026-11-01 to 2026-11-03 is 3 days.
 */
export function calculateInclusiveDays(startDate: string, endDate: string): number {
  if (!startDate || !endDate) return 0;
  const start = new Date(startDate + 'T00:00:00Z');
  const end = new Date(endDate + 'T00:00:00Z');
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
    return 0;
  }
  const diffTime = end.getTime() - start.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
  return diffDays + 1;
}

/**
 * Generates an array of all ISO date strings (YYYY-MM-DD) within the range inclusive.
 */
export function generateDateRangeList(startDate: string, endDate: string): string[] {
  const days = calculateInclusiveDays(startDate, endDate);
  if (days <= 0) return [];
  const dates: string[] = [];
  const current = new Date(startDate + 'T00:00:00Z');
  for (let i = 0; i < days; i++) {
    dates.push(current.toISOString().split('T')[0]);
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return dates;
}

/**
 * Currency formatter for Indian Rupees (INR)
 */
export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

/**
 * Calculates recorded agreed total for a request.
 * Free lend and swap are always 0.
 */
export function calculateAgreedTotal(
  pricePerDay: number,
  days: number,
  transactionType: TransactionType
): number {
  if (transactionType === 'free lend' || transactionType === 'swap') {
    return 0;
  }
  return Math.max(0, (pricePerDay || 0) * (days || 0));
}

/**
 * Commission & Owner Earnings.
 * Owner earnings = completed value minus commission.
 */
export function calculateCommissionAndEarnings(
  completedTotal: number,
  commissionPct: number = DEFAULT_COMMISSION_PCT
): { commission: number; ownerEarnings: number } {
  const safeTotal = Math.max(0, completedTotal || 0);
  const commission = Math.round(safeTotal * commissionPct);
  const ownerEarnings = Math.max(0, safeTotal - commission);
  return { commission, ownerEarnings };
}

/**
 * Cancellation policy:
 * Less than 48 hours before 00:00 on the start date is recorded as a late cancellation.
 */
export function isLateCancellation(startDate: string, now: Date = new Date()): boolean {
  if (!startDate) return false;
  const startTimestamp = new Date(startDate + 'T00:00:00').getTime();
  const diffHours = (startTimestamp - now.getTime()) / (1000 * 60 * 60);
  return diffHours < 48;
}

/**
 * Estimated borrower savings (ESTIMATE):
 * Only completed bookings where borrower answered yes to would-have-bought.
 * Spend avoided = replacement value - recorded fees paid.
 */
export function calculateEstimatedSavings(
  replacementValue: number,
  recordedFeesPaid: number,
  wouldHaveBought: boolean
): number {
  if (!wouldHaveBought) return 0;
  return Math.max(0, (replacementValue || 0) - (recordedFeesPaid || 0));
}

/**
 * Completion rate calculation:
 * completed / (approved + completed + cancelled after approval)
 */
export function calculateCompletionRate(
  completedCount: number,
  approvedCount: number,
  cancelledAfterApprovalCount: number
): number {
  const total = completedCount + approvedCount + cancelledAfterApprovalCount;
  if (total === 0) return 0;
  return Math.round((completedCount / total) * 100);
}

/**
 * Category-specific handover/return checklist templates
 */
export function getDefaultChecklistForCategory(category: Category): string[] {
  switch (category) {
    case 'Cameras and creator gear':
      return [
        'Body & lens clean with no scratches on glass',
        'Battery charged and charger/cable included',
        'SD/memory card slot working & cap attached',
        'Camera powers on, screen displays and takes test photo',
      ];
    case 'Travel and luggage':
      return [
        'Zippers, locks and pull-handles glide smoothly',
        'Wheels roll freely with no wobbling or cracks',
        'Interior clean and free of stains or odors',
      ];
    case 'Tools and DIY':
      return [
        'All drill bits / accessories / safety guards present',
        'Power cord or battery packs in undamaged condition',
        'Motor spins and safety stop operates cleanly',
      ];
    case 'Kitchen and appliances':
      return [
        'All bowls, blades, lids and attachments accounted for',
        'Thoroughly washed, food-safe and dry',
        'Motor/heating element powers on as expected',
      ];
    case 'Sports and outdoor':
      return [
        'Tents/poles/stakes intact and canvas dry',
        'Zippers and straps secure',
        'No visible tears or structural bending',
      ];
    case 'Electronics and gadgets':
      return [
        'Original power adapter and cables provided',
        'Display is free of dead pixels and cracks',
        'Device factory reset / logged out of personal accounts',
      ];
    case 'Musical instruments':
      return [
        'Strings/keys/frets undamaged and clean',
        'Protective case, tuner or bow included',
        'Produces clean sound with no buzz or split seams',
      ];
    default:
      return [
        'Item matches listing photos and described condition',
        'All essential cords, pieces and accessories present',
        'Item tested and operating properly during handover',
        'Clear agreement on return date, time and location',
      ];
  }
}
