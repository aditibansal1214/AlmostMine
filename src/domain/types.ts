export type Category =
  | 'Cameras and creator gear'
  | 'Travel and luggage'
  | 'Tools and DIY'
  | 'Kitchen and appliances'
  | 'Party and event supplies'
  | 'Sports and outdoor'
  | 'Books and study'
  | 'Electronics and gadgets'
  | 'Furniture and decor'
  | 'Musical instruments'
  | 'Kids and baby'
  | 'Other';

export type ItemCondition = 'New' | 'Like new' | 'Good' | 'Fair';

export type TransactionType = 'rent' | 'free lend' | 'swap';

export type ListingStatus = 'draft' | 'active' | 'paused' | 'removed';

export type BookingStatus = 'pending' | 'approved' | 'rejected' | 'cancelled' | 'completed';

export interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  landing: 'home' | 'browse' | 'items';
  language: 'en';
  timeZone: string;
  dateFormat: 'YYYY-MM-DD' | 'DD/MM/YYYY';
  accessibility: {
    highContrast: boolean;
    reducedMotion: boolean;
    textSize: 'small' | 'medium' | 'large';
  };
  notificationPrefs: {
    bookingUpdates: boolean;
    savedSearches: boolean;
    wishResponses: boolean;
    reviewReminders: boolean;
    emailEnabled: boolean; // always false with note
  };
  dashboardPrefs: {
    kpis: string[];
    widgets: string[];
  };
}

export interface UserPrivate {
  uid: string;
  email: string | null;
  phone: string | null;
  phoneVerified?: boolean;
  firstName: string;
  lastName: string;
  settings: UserSettings;
  marketplacePrefs?: {
    preferredCategories: Category[];
    minPrice?: number;
    maxPrice?: number;
    transactionTypes: TransactionType[];
    communityId?: string;
  };
  recentlyViewed?: string[];
  onboarding: {
    done: boolean;
    step: number;
  };
  createdAt?: any;
  updatedAt?: any;
}

export interface PublicProfile {
  uid: string;
  displayName: string;
  username: string;
  avatarUrl?: string;
  bio?: string;
  locality?: string;
  communityId?: string;
  interests?: string[];
  visibility: {
    bio: boolean;
    locality: boolean;
    interests: boolean;
    showLastName: boolean;
    discoverable: boolean;
  };
  memberSince?: any;
  deleted?: boolean;
}

export interface Community {
  id: string;
  name: string;
  locality: string;
  city: string;
  state?: string;
  memberCount?: number;
  description?: string;
}

export interface Listing {
  id: string;
  ownerId: string;
  title: string;
  description: string;
  category: Category;
  condition: ItemCondition;
  replacementValue: number; // in INR
  transactionType: TransactionType;
  pricePerDay: number; // 0 for free lend / swap
  minDays: number;
  maxDays: number;
  depositInfo?: string; // Information only
  images: string[];
  communityId: string;
  locality: string;
  rules?: string;
  handover?: string;
  status: ListingStatus;
  blockedDates?: string[]; // YYYY-MM-DD
  removedAt?: any;
  pinned?: boolean;
  lastReactivatedAt?: any;
  isDemo?: boolean;
  dataSource?: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface LockedDay {
  id?: string; // YYYY-MM-DD
  date: string;
  type: 'booking' | 'blocked';
  bookingId?: string;
  ownerId: string;
  createdAt?: any;
}

export interface ChecklistItem {
  id: string;
  label: string;
  checkedByOwner: boolean;
  checkedByBorrower: boolean;
  note?: string;
}

export interface Booking {
  id: string;
  listingId: string;
  ownerId: string;
  borrowerId: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  days: number;
  transactionType: TransactionType;
  pricePerDayAtRequest: number;
  agreedTotal: number;
  commissionPct: number; // e.g. 0.08
  status: BookingStatus;
  wouldHaveBought?: 'yes' | 'no' | 'maybe';
  borrowerMessage?: string;
  rejectionReason?: string;
  cancelReason?: string;
  cancelledBy?: string;
  lateCancellation?: boolean;
  respondedAt?: any;
  approvedAt?: any;
  completedAt?: any;
  checklist?: {
    items: ChecklistItem[];
    handoverAcknowledgedOwner?: boolean;
    handoverAcknowledgedBorrower?: boolean;
    returnAcknowledgedOwner?: boolean;
    returnAcknowledgedBorrower?: boolean;
    notes?: string;
  };
  listingSnapshot: {
    title: string;
    image: string;
    category: Category;
    replacementValue: number;
  };
  isDemo?: boolean;
  createdAt?: any;
  updatedAt?: any;
}

export interface StatusHistoryEvent {
  id?: string;
  fromStatus: BookingStatus | null;
  toStatus: BookingStatus;
  actorUid: string;
  note?: string;
  at: any;
}

export interface PublicActivityEvent {
  id?: string;
  type: 'request_created' | 'booking_approved' | 'booking_rejected' | 'booking_cancelled' | 'booking_completed';
  subjectUid: string; // actor
  otherUid: string;
  listingId: string;
  category: Category;
  communityId: string;
  bookingId: string;
  hoursToRespond?: number;
  at: any;
}

export interface Review {
  bookingId: string;
  reviewerId: string;
  revieweeId: string;
  rating: number; // 1 to 5
  text: string; // max 500
  createdAt?: any;
}

export interface Wish {
  id: string;
  requesterId: string;
  requesterName: string;
  itemName: string;
  category: Category;
  neededFrom: string; // YYYY-MM-DD
  neededTo: string; // YYYY-MM-DD
  maxBudgetPerDay: number;
  communityId: string;
  status: 'open' | 'fulfilled' | 'closed';
  isDemo?: boolean;
  createdAt?: any;
  updatedAt?: any;
}

export interface SavedSearch {
  id: string;
  userId: string;
  query?: string;
  category?: Category;
  communityId?: string;
  maxPrice?: number;
  lastCheckedAt?: any;
  createdAt?: any;
}

export interface InAppNotification {
  id: string;
  recipientId: string;
  title: string;
  message: string;
  link?: string;
  type: 'booking' | 'saved_search' | 'wish' | 'review' | 'system';
  read: boolean;
  createdAt: any;
}
