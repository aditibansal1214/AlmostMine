export interface KPIDefinition {
  id: string;
  label: string;
  type: 'Recorded' | 'Estimated';
  formula: string;
  description: string;
  statusFilters: string[];
  sourceCollections: string[];
  format: 'currency' | 'number' | 'percentage';
}

export const KPI_REGISTRY: Record<string, KPIDefinition> = {
  earned: {
    id: 'earned',
    label: 'Earned',
    type: 'Recorded',
    formula: 'SUM(agreedTotal * (1 - commissionPct)) for completed bookings as owner',
    description: 'Actual net owner earnings from rentals marked returned and completed, after standard platform commission.',
    statusFilters: ['completed'],
    sourceCollections: ['bookings'],
    format: 'currency',
  },
  itemsSharing: {
    id: 'itemsSharing',
    label: 'Items Sharing',
    type: 'Recorded',
    formula: 'COUNT(listings where status == "active" and ownerId == currentUser)',
    description: 'Number of active listings currently available for your community to borrow or rent.',
    statusFilters: ['active'],
    sourceCollections: ['listings'],
    format: 'number',
  },
  requestsWaiting: {
    id: 'requestsWaiting',
    label: 'Requests Waiting',
    type: 'Recorded',
    formula: 'COUNT(bookings where status == "pending" and ownerId == currentUser)',
    description: 'Incoming borrow requests awaiting your approval or review.',
    statusFilters: ['pending'],
    sourceCollections: ['bookings'],
    format: 'number',
  },
  saved: {
    id: 'saved',
    label: 'Saved',
    type: 'Estimated',
    formula: 'SUM(replacementValue - agreedTotal) for completed bookings where borrower answered yes to would-have-bought',
    description: 'Upper-bound estimated expense avoided by borrowing instead of buying new, calculated only when you answered yes to would-have-bought.',
    statusFilters: ['completed'],
    sourceCollections: ['bookings', 'listings'],
    format: 'currency',
  },
  adminActiveListings: {
    id: 'adminActiveListings',
    label: 'Active Listings',
    type: 'Recorded',
    formula: 'COUNT(listings where status == "active")',
    description: 'Total active community listings published across the platform.',
    statusFilters: ['active'],
    sourceCollections: ['listings'],
    format: 'number',
  },
  adminCompletedExchanges: {
    id: 'adminCompletedExchanges',
    label: 'Completed Exchanges',
    type: 'Recorded',
    formula: 'COUNT(bookings where status == "completed")',
    description: 'Total rentals or lends completed and returned safely.',
    statusFilters: ['completed'],
    sourceCollections: ['bookings'],
    format: 'number',
  },
  adminCompletionRate: {
    id: 'adminCompletionRate',
    label: 'Completion Rate',
    type: 'Recorded',
    formula: 'completed / (approved + completed + cancelled after approval)',
    description: 'Percentage of approved bookings that successfully reach completion.',
    statusFilters: ['completed', 'approved', 'cancelled'],
    sourceCollections: ['bookings'],
    format: 'percentage',
  },
  adminCompletedValue: {
    id: 'adminCompletedValue',
    label: 'Completed Value',
    type: 'Recorded',
    formula: 'SUM(agreedTotal) for completed bookings',
    description: 'Total gross value exchanged through completed rentals.',
    statusFilters: ['completed'],
    sourceCollections: ['bookings'],
    format: 'currency',
  },
};
