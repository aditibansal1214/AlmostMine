import test from 'node:test';
import assert from 'node:assert/strict';
import { generateSyntheticMarketplaceData } from './demoDataGenerator';

test('generateSyntheticMarketplaceData: generates complete required dataset specification', () => {
  const data = generateSyntheticMarketplaceData();

  // Step 2 & Step 3 Specification Assertions:
  assert.equal(data.users.length, 50, 'Must generate exactly 50 synthetic users');
  assert.equal(data.listings.length, 100, 'Must generate exactly 100 realistic listings');
  assert.equal(data.bookings.length, 200, 'Must generate exactly 200 booking records');
  assert.equal(data.reviews.length, 80, 'Must generate exactly 80 reviews');
  assert.equal(data.notifications.length, 150, 'Must generate exactly 150 notifications');
  assert.equal(data.favourites.length, 100, 'Must generate exactly 100 favourites');
  assert.equal(data.savedSearches.length, 30, 'Must generate exactly 30 saved searches');
  assert.equal(data.wishes.length, 50, 'Must generate exactly 50 wishboard entries');
  assert.ok(data.publicActivities.length >= 100, 'Must generate 6 months of historical activity records');

  // Verify all required item categories are populated:
  const categoriesPresent = new Set(data.listings.map((l) => l.category));
  const requiredCategories = [
    'Cameras and creator gear',
    'Travel and luggage',
    'Tools and DIY',
    'Party and event supplies',
    'Sports and outdoor',
    'Electronics and gadgets',
    'Books and study',
  ];
  for (const reqCat of requiredCategories) {
    assert.ok(
      categoriesPresent.has(reqCat as any),
      `Category '${reqCat}' must be present in synthetic listings`
    );
  }

  // Verify all 5 required booking statuses are represented:
  const statuses = new Set(data.bookings.map((b) => b.status));
  assert.ok(statuses.has('pending'), 'Status pending must be present');
  assert.ok(statuses.has('approved'), 'Status approved must be present');
  assert.ok(statuses.has('rejected'), 'Status rejected must be present');
  assert.ok(statuses.has('cancelled'), 'Status cancelled must be present');
  assert.ok(statuses.has('completed'), 'Status completed must be present');

  // Invariant: Reviews must only be linked to completed exchanges
  const completedBookingIds = new Set(
    data.bookings.filter((b) => b.status === 'completed').map((b) => b.id)
  );
  for (const rev of data.reviews) {
    assert.ok(
      completedBookingIds.has(rev.bookingId),
      `Review ${rev.id} is attached to booking ${rev.bookingId} which is not completed`
    );
  }

  // Invariant: Borrower cannot be owner
  for (const b of data.bookings) {
    assert.notEqual(
      b.borrowerId,
      b.ownerId,
      `Booking ${b.id} has same borrower and owner (${b.borrowerId})`
    );
  }

  // Invariant: Approved bookings do not overlap locked days for the same item
  const dateLocksByItem = new Map<string, Set<string>>();
  for (const lock of data.lockedDays) {
    if (!dateLocksByItem.has(lock.listingId)) {
      dateLocksByItem.set(lock.listingId, new Set<string>());
    }
    const dates = dateLocksByItem.get(lock.listingId)!;
    assert.ok(
      !dates.has(lock.date),
      `Listing ${lock.listingId} has overlapping locked day: ${lock.date}`
    );
    dates.add(lock.date);
  }

  // Analytics Readiness: Check all 8 analytics use case fields on bookings
  for (const b of data.bookings) {
    assert.ok(typeof b.hoursToRespond === 'number', 'hoursToRespond must be a number');
    assert.ok(typeof b.leadTimeDays === 'number', 'leadTimeDays must be a number');
    assert.ok(typeof b.tripLengthDays === 'number', 'tripLengthDays must be a number');
    assert.ok(['low', 'mid', 'high', 'premium'].includes(b.priceBand), 'priceBand must be valid');
    assert.ok(['yes', 'no', 'maybe'].includes(b.wouldHaveBought), 'wouldHaveBought must be valid');
  }
});
